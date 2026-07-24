import { getNeonSql, hasNeonDatabase } from "~/lib/neon/client";
import { ensureNeonAppSchema } from "~/lib/neon/schema";
import { getDistanceMeters, type Coordinate } from "./geo";
import type { SunsetLocationCandidate } from "./types";

/**
 * Bump when the *shape or sourcing* of stored spot facts changes (a new
 * Overpass tag set, a new enrichment field, a changed candidate key). Rows and
 * sweeps carrying an older version stop matching, so the next request re-sweeps
 * from live sources. Scoring criteria do NOT need a bump — ranking is always
 * recomputed from these facts, never read from the store.
 */
export const SPOT_DATA_VERSION = 1;

/**
 * OSM/Places facts move on a scale of months; a monthly re-sweep is enough to
 * pick up new viewpoints without paying the external cost per request.
 */
const SWEEP_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Requests are snapped to this grid so that panning around a city reuses one
 * sweep instead of minting a new cache key every ~110 m. 0.05 deg is ~5.5 km
 * of latitude — roughly one neighbourhood.
 */
const TILE_DEGREES = 0.05;

const METERS_PER_DEGREE_LATITUDE = 111_320;

/**
 * A sweep is centred on the tile centre, so a request anywhere inside the tile
 * sits at most half a tile diagonal away. Sweeps are inflated by this much so
 * they fully cover the tile regardless of where in it the user actually is.
 */
const TILE_HALF_DIAGONAL_METERS = Math.round(
  (Math.SQRT2 / 2) * TILE_DEGREES * METERS_PER_DEGREE_LATITUDE,
);

/**
 * Horizon profiles are sampled along the sunset azimuth, which drifts up to
 * ~0.4 deg/day near the equinoxes. Past this drift the stored west/east
 * profiles no longer point where the sun actually sets, so they are re-sampled.
 */
const MAX_PROFILE_AZIMUTH_DRIFT_DEG = 4;

export interface SpotTile {
  key: string;
  center: Coordinate;
}

export interface StoredSpot {
  candidate: SunsetLocationCandidate;
  profileAzimuthDeg: number | null;
}

export interface SweepCoverage {
  radiusMeters: number;
  sweptAt: string;
  hasTerrain: boolean;
}

export function getSpotTile(center: Coordinate): SpotTile {
  const latitudeIndex = Math.floor(center.latitude / TILE_DEGREES);
  const longitudeIndex = Math.floor(center.longitude / TILE_DEGREES);

  return {
    key: `v${SPOT_DATA_VERSION}:${latitudeIndex}:${longitudeIndex}`,
    // The tile's true centroid, not its corner: sweeps run from here, so every
    // point in the tile is within half a diagonal of the sweep origin.
    center: {
      latitude: (latitudeIndex + 0.5) * TILE_DEGREES,
      longitude: (longitudeIndex + 0.5) * TILE_DEGREES,
    },
  };
}

/** Radius a sweep must cover so every point in the tile sees `radiusMeters`. */
export function getSweepRadiusMeters(radiusMeters: number): number {
  return radiusMeters + TILE_HALF_DIAGONAL_METERS;
}

export function isProfileAzimuthStale(
  storedAzimuthDeg: number | null,
  currentAzimuthDeg: number,
): boolean {
  if (storedAzimuthDeg === null) {
    return true;
  }

  const drift = Math.abs(
    ((storedAzimuthDeg - currentAzimuthDeg + 540) % 360) - 180,
  );

  return drift > MAX_PROFILE_AZIMUTH_DRIFT_DEG;
}

export function getSpotKey(candidate: SunsetLocationCandidate): string {
  return [
    candidate.name.toLowerCase().replaceAll(/[^a-z0-9]/g, ""),
    candidate.latitude.toFixed(3),
    candidate.longitude.toFixed(3),
  ].join("-");
}

/**
 * The spot store is an optimisation, never a dependency. Discovery worked
 * without a database before it existed and must keep working if the database
 * is unreachable — a read failure degrades to a live sweep, a write failure
 * just means the next request pays for the sweep again.
 */
async function withStoreFallback<T>(
  operation: string,
  fallback: T,
  run: () => Promise<T>,
): Promise<T> {
  if (!hasNeonDatabase()) {
    return fallback;
  }

  try {
    await ensureNeonAppSchema();
    return await run();
  } catch (error) {
    console.warn(
      `Spot store ${operation} failed; falling back to live discovery.`,
      error,
    );
    return fallback;
  }
}

/**
 * Best sweep covering the tile, terrain-complete or not. Callers decide what a
 * terrain-less sweep is worth: it still spares every discovery API call, so a
 * terrain request upgrades it in place rather than re-sweeping from scratch.
 */
export function findSweepCoverage(options: {
  tile: SpotTile;
  radiusMeters: number;
}): Promise<SweepCoverage | null> {
  return withStoreFallback("coverage lookup", null, async () => {
    const sql = getNeonSql();
    const freshAfter = new Date(Date.now() - SWEEP_TTL_MS).toISOString();
    const rows = (await sql`
    select radius_meters, swept_at, has_terrain
    from sunset_spot_sweeps
    where tile_key = ${options.tile.key}
      and data_version = ${SPOT_DATA_VERSION}
      and radius_meters >= ${getSweepRadiusMeters(options.radiusMeters)}
      and swept_at > ${freshAfter}::timestamptz
    order by has_terrain desc, radius_meters asc
    limit 1
  `) as Array<{
      radius_meters: number;
      swept_at: string;
      has_terrain: boolean;
    }>;
    const row = rows[0];

    if (!row) {
      return null;
    }

    return {
      radiusMeters: row.radius_meters,
      sweptAt: new Date(row.swept_at).toISOString(),
      hasTerrain: row.has_terrain,
    };
  });
}

/**
 * Reads stored spots inside `radiusMeters` of the *request* centre (not the
 * tile centre). The SQL bounding box is a cheap index-friendly prefilter; the
 * exact circle is applied in memory.
 */
export function readSpotsNear(
  center: Coordinate,
  radiusMeters: number,
): Promise<StoredSpot[]> {
  return withStoreFallback<StoredSpot[]>("spot read", [], async () => {
    const latitudeDelta = radiusMeters / METERS_PER_DEGREE_LATITUDE;
    const longitudeDelta =
      radiusMeters /
      (METERS_PER_DEGREE_LATITUDE *
        Math.max(Math.cos((center.latitude * Math.PI) / 180), 0.01));

    const sql = getNeonSql();
    const rows = (await sql`
      select candidate_json, profile_azimuth_deg
      from sunset_spots
      where data_version = ${SPOT_DATA_VERSION}
        and latitude between ${center.latitude - latitudeDelta}
          and ${center.latitude + latitudeDelta}
        and longitude between ${center.longitude - longitudeDelta}
          and ${center.longitude + longitudeDelta}
    `) as Array<{
      candidate_json: unknown;
      profile_azimuth_deg: number | null;
    }>;

    return rows
      .map((row) => ({
        candidate: parseCandidate(row.candidate_json),
        profileAzimuthDeg: row.profile_azimuth_deg,
      }))
      .filter(
        (spot) => getDistanceMeters(center, spot.candidate) <= radiusMeters,
      );
  });
}

/**
 * Persists a completed sweep: every candidate found, plus the sweep receipt
 * that lets a later request know this tile is already covered. Written in one
 * transaction so a partially-written sweep can never be reported as covered.
 */
export function saveSweep(options: {
  tile: SpotTile;
  radiusMeters: number;
  hasTerrain: boolean;
  profileAzimuthDeg: number | null;
  candidates: SunsetLocationCandidate[];
}): Promise<void> {
  return withStoreFallback("sweep write", undefined, async () => {
    const sql = getNeonSql();
    const sweptAt = new Date().toISOString();
    const spotWrites = options.candidates.map((candidate) =>
      buildSpotUpsert(sql, candidate, options.profileAzimuthDeg, sweptAt),
    );

    await sql.transaction([
      ...spotWrites,
      sql`
      insert into sunset_spot_sweeps (
        sweep_key,
        tile_key,
        center_lat,
        center_lon,
        radius_meters,
        data_version,
        has_terrain,
        spot_count,
        swept_at
      )
      values (
        ${`${options.tile.key}:${options.radiusMeters}`},
        ${options.tile.key},
        ${options.tile.center.latitude},
        ${options.tile.center.longitude},
        ${options.radiusMeters},
        ${SPOT_DATA_VERSION},
        ${options.hasTerrain},
        ${options.candidates.length},
        ${sweptAt}
      )
      on conflict (sweep_key) do update
      set has_terrain = excluded.has_terrain or sunset_spot_sweeps.has_terrain,
          spot_count = excluded.spot_count,
          swept_at = excluded.swept_at
    `,
    ]);
  });
}

/** Writes back re-sampled horizon profiles after an azimuth-drift refresh. */
export function saveSpotProfiles(options: {
  candidates: SunsetLocationCandidate[];
  profileAzimuthDeg: number;
}): Promise<void> {
  if (options.candidates.length === 0) {
    return Promise.resolve();
  }

  return withStoreFallback("profile write", undefined, async () => {
    const sql = getNeonSql();

    await sql.transaction(
      options.candidates.map(
        (candidate) => sql`
        update sunset_spots
        set candidate_json = ${JSON.stringify(candidate)},
            profile_azimuth_deg = ${options.profileAzimuthDeg},
            refreshed_at = now()
        where spot_key = ${getSpotKey(candidate)}
          and data_version = ${SPOT_DATA_VERSION}
      `,
      ),
    );
  });
}

function buildSpotUpsert(
  sql: ReturnType<typeof getNeonSql>,
  candidate: SunsetLocationCandidate,
  profileAzimuthDeg: number | null,
  refreshedAt: string,
) {
  return sql`
    insert into sunset_spots (
      spot_key,
      latitude,
      longitude,
      candidate_json,
      data_version,
      profile_azimuth_deg,
      refreshed_at
    )
    values (
      ${getSpotKey(candidate)},
      ${candidate.latitude},
      ${candidate.longitude},
      ${JSON.stringify(candidate)},
      ${SPOT_DATA_VERSION},
      ${profileAzimuthDeg},
      ${refreshedAt}
    )
    on conflict (spot_key) do update
    set latitude = excluded.latitude,
        longitude = excluded.longitude,
        candidate_json = excluded.candidate_json,
        data_version = excluded.data_version,
        profile_azimuth_deg = excluded.profile_azimuth_deg,
        refreshed_at = excluded.refreshed_at
  `;
}

function parseCandidate(value: unknown): SunsetLocationCandidate {
  return typeof value === "string"
    ? (JSON.parse(value) as SunsetLocationCandidate)
    : (value as SunsetLocationCandidate);
}
