import { getDistanceMeters, type Coordinate } from "./geo";
import { enrichCandidatesWithReferenceImages } from "./mediawiki";
import {
  fetchOverpassSunsetCandidates,
  OverpassRequestError,
} from "./overpass";
import { fetchGooglePlacesCandidates } from "./places";
import { rankSunsetLocation } from "./ranking";
import {
  findSweepCoverage,
  getSpotKey,
  getSpotTile,
  getSweepRadiusMeters,
  isProfileAzimuthStale,
  readSpotsNear,
  saveSpotProfiles,
  saveSweep,
  type SpotTile,
  type StoredSpot,
} from "./spotStore";
import {
  enrichCandidatesWithTerrain,
  getSunsetAzimuthDegrees,
} from "./terrain";
import {
  getNearbyValidatedCandidates,
  mergeValidatedReferences,
} from "./validation";
import type {
  DiscoveryPassName,
  DiscoverySearchDiagnostics,
  RankedSunsetLocation,
  SunsetLocationCandidate,
} from "./types";

const DEFAULT_RADIUS_METERS = 20_000;
const HIGH_CONFIDENCE_RADIUS_METERS = 12_000;
const MAX_RADIUS_METERS = 35_000;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 25;
const DISCOVERY_CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * A sweep is stored once and served to every later request in the tile, so it
 * collects well past a single request's `limit` — a later `limit=25` request
 * can then be served from the same sweep.
 */
const SWEEP_CANDIDATE_LIMIT = MAX_LIMIT;

/**
 * Terrain enrichment is the slowest external step (chunked Open-Meteo calls),
 * so only the strongest candidates of a sweep get a horizon profile. The
 * ranker degrades to keyword heuristics for the rest.
 */
const TERRAIN_ENRICH_LIMIT = 24;

const discoveryCache = new Map<
  string,
  {
    expiresAt: number;
    sweep: SweepResult;
  }
>();

export interface DiscoverSunsetLocationsOptions extends Coordinate {
  radiusMeters?: number;
  limit?: number;
  /**
   * When false, skip the (slower) terrain enrichment and rank on keyword
   * heuristics only. Used for the progressive first paint — the client fetches
   * `terrain=false` for an instant result, then `terrain=true` to refine.
   */
  includeTerrain?: boolean;
}

interface SweepResult {
  candidates: SunsetLocationCandidate[];
  passesTried: DiscoveryPassName[];
}

/** A database-served tile did not run any pass; report what its sweep ran. */
const SWEEP_PASSES: DiscoveryPassName[] = [
  "high-confidence",
  "broad-scenic",
  "regional-fallback",
];

export interface DiscoverSunsetLocationsResult {
  center: Coordinate;
  radiusMeters: number;
  generatedAt: string;
  candidates: RankedSunsetLocation[];
  source: "live-overpass" | "validated-fallback" | "mixed";
  searchDiagnostics: DiscoverySearchDiagnostics;
}

export async function discoverSunsetLocations(
  options: DiscoverSunsetLocationsOptions,
): Promise<DiscoverSunsetLocationsResult> {
  const radiusMeters = clampRadius(options.radiusMeters);
  const limit = clampLimit(options.limit);
  const includeTerrain = options.includeTerrain !== false;
  const center = {
    latitude: options.latitude,
    longitude: options.longitude,
  };
  const tile = getSpotTile(center);
  const { sweep, cacheStatus } = await loadSweep({
    tile,
    radiusMeters,
    includeTerrain,
  });
  const candidatesInRange = sweep.candidates.filter(
    (candidate) => getDistanceMeters(center, candidate) <= radiusMeters,
  );
  // Validated seeds are a local fixture lookup, so they are merged on every
  // read rather than baked into the sweep — a seed added after a sweep still
  // shows up without waiting for the sweep to expire.
  const validatedCandidates = getNearbyValidatedCandidates(center, radiusMeters);
  const candidates = dedupeCandidates([
    ...candidatesInRange,
    ...validatedCandidates,
  ])
    .map(mergeValidatedReferences)
    // Scores, phase fit and golden-hour times are always recomputed: they
    // depend on today's sun position and must never be served from storage.
    .map(rankSunsetLocation)
    .filter((candidate) => candidate.publicAccess)
    .sort((a, b) => {
      const scoreDelta = b.totalScore - a.totalScore;

      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return getDistanceMeters(center, a) - getDistanceMeters(center, b);
    })
    .slice(0, limit);

  const result: DiscoverSunsetLocationsResult = {
    center,
    radiusMeters,
    generatedAt: new Date().toISOString(),
    candidates,
    source: getResultSource(candidatesInRange.length, validatedCandidates.length),
    searchDiagnostics: {
      requestedRadiusMeters: options.radiusMeters ?? DEFAULT_RADIUS_METERS,
      effectiveRadiusMeters: radiusMeters,
      passesTried: sweep.passesTried,
      liveCandidateCount: candidatesInRange.length,
      validatedCandidateCount: validatedCandidates.length,
      cacheStatus,
      fallbackReason:
        candidatesInRange.length === 0
          ? "No live Overpass candidates matched; returned nearby validated seeds when available."
          : null,
    },
  };

  return result;
}

/**
 * Resolves the tile's candidate set through the three cache tiers, cheapest
 * first: process memory, the durable spot store, then the external sweep.
 *
 * All three are keyed on the *tile*, not the request centre, and hold raw
 * candidates rather than ranked output — so panning inside a neighbourhood
 * reuses one entry, and every request still scores against today's sun.
 */
async function loadSweep(options: {
  tile: SpotTile;
  radiusMeters: number;
  includeTerrain: boolean;
}): Promise<{
  sweep: SweepResult;
  cacheStatus: DiscoverySearchDiagnostics["cacheStatus"];
}> {
  const cacheKey = getDiscoveryCacheKey(
    options.tile.key,
    options.radiusMeters,
    options.includeTerrain,
  );
  const cachedSweep = discoveryCache.get(cacheKey);

  if (cachedSweep && cachedSweep.expiresAt > Date.now()) {
    return { sweep: cachedSweep.sweep, cacheStatus: "hit" };
  }

  const storedSweep = await loadSweptCandidates(options);
  const sweep = storedSweep ?? (await runSweep(options));

  discoveryCache.set(cacheKey, {
    expiresAt: Date.now() + DISCOVERY_CACHE_TTL_MS,
    sweep,
  });

  return { sweep, cacheStatus: storedSweep ? "database" : "miss" };
}

/**
 * Serves a tile from the durable store when a fresh sweep covers it. Returns
 * null when the tile was never swept (or the sweep predates the current
 * `SPOT_DATA_VERSION`), which sends the caller to the live path.
 */
async function loadSweptCandidates(options: {
  tile: SpotTile;
  radiusMeters: number;
  includeTerrain: boolean;
}): Promise<SweepResult | null> {
  const coverage = await findSweepCoverage({
    tile: options.tile,
    radiusMeters: options.radiusMeters,
  });

  if (!coverage) {
    return null;
  }

  // Read the whole tile, not just the caller's circle, so the result is
  // reusable by any request landing in this tile.
  const storedSpots = await readSpotsNear(
    options.tile.center,
    coverage.radiusMeters,
  );

  if (storedSpots.length === 0) {
    // A swept-but-empty tile is a real answer, not a cache miss — re-running
    // Overpass over open ocean would never produce anything either.
    return { candidates: [], passesTried: SWEEP_PASSES };
  }

  // The tile was swept without terrain (the progressive first paint) and this
  // request wants it. Only the elevation pass is missing — upgrade the stored
  // sweep in place instead of paying for Overpass and Places a second time.
  if (options.includeTerrain && !coverage.hasTerrain) {
    const upgraded = await enrichStrongestWithTerrain(
      storedSpots.map((spot) => spot.candidate),
      options.tile.center,
    );

    await saveSweep({
      tile: options.tile,
      radiusMeters: coverage.radiusMeters,
      hasTerrain: true,
      profileAzimuthDeg: upgraded.profileAzimuthDeg,
      candidates: upgraded.candidates,
    });

    return { candidates: upgraded.candidates, passesTried: SWEEP_PASSES };
  }

  return {
    candidates: await refreshDriftedProfiles(
      storedSpots,
      options.tile.center,
      options.includeTerrain,
    ),
    passesTried: SWEEP_PASSES,
  };
}

/**
 * Horizon profiles are sampled along the sunset azimuth, which moves through
 * the year. Spots whose stored profile points somewhere the sun no longer sets
 * are re-sampled (and written back) so the rest of the tile stays free.
 */
async function refreshDriftedProfiles(
  storedSpots: StoredSpot[],
  center: Coordinate,
  includeTerrain: boolean,
): Promise<SunsetLocationCandidate[]> {
  if (!includeTerrain) {
    return storedSpots.map((spot) => spot.candidate);
  }

  const currentAzimuthDeg = getSunsetAzimuthDegrees(center);
  const staleSpots = storedSpots.filter(
    (spot) =>
      spot.candidate.viewProfiles !== undefined &&
      isProfileAzimuthStale(spot.profileAzimuthDeg, currentAzimuthDeg),
  );

  if (staleSpots.length === 0) {
    return storedSpots.map((spot) => spot.candidate);
  }

  const refreshed = await enrichCandidatesWithTerrain(
    staleSpots.map((spot) => spot.candidate),
  );
  const refreshedByKey = new Map(
    refreshed.map((candidate) => [getSpotKey(candidate), candidate]),
  );

  await saveSpotProfiles({
    candidates: refreshed,
    profileAzimuthDeg: currentAzimuthDeg,
  });

  return storedSpots.map(
    (spot) =>
      refreshedByKey.get(getSpotKey(spot.candidate)) ?? spot.candidate,
  );
}

/**
 * The expensive path: hit every external source once for the whole tile, then
 * persist the result so no other request in this tile has to.
 */
async function runSweep(options: {
  tile: SpotTile;
  radiusMeters: number;
  includeTerrain: boolean;
}): Promise<SweepResult> {
  const sweepRadiusMeters = Math.min(
    getSweepRadiusMeters(options.radiusMeters),
    MAX_RADIUS_METERS,
  );
  const liveSearch = await fetchLiveCandidates(
    options.tile.center,
    sweepRadiusMeters,
    SWEEP_CANDIDATE_LIMIT,
  );
  const enrichedCandidates = await enrichCandidatesWithReferenceImages(
    liveSearch.candidates.map(mergeValidatedReferences),
  );
  const { candidates, profileAzimuthDeg } = options.includeTerrain
    ? await enrichStrongestWithTerrain(enrichedCandidates, options.tile.center)
    : { candidates: enrichedCandidates, profileAzimuthDeg: null };

  await saveSweep({
    tile: options.tile,
    radiusMeters: sweepRadiusMeters,
    hasTerrain: options.includeTerrain,
    profileAzimuthDeg,
    candidates,
  });

  return { candidates, passesTried: liveSearch.passesTried };
}

/**
 * Ranks on keyword heuristics first and only pays for elevation on the
 * strongest candidates — a full sweep can hold several times more spots than
 * any single request renders.
 */
async function enrichStrongestWithTerrain(
  candidates: SunsetLocationCandidate[],
  center: Coordinate,
): Promise<{
  candidates: SunsetLocationCandidate[];
  profileAzimuthDeg: number | null;
}> {
  if (candidates.length === 0) {
    return { candidates, profileAzimuthDeg: null };
  }

  const strongestKeys = new Set(
    candidates
      .map((candidate) => ({
        key: getSpotKey(candidate),
        score: rankSunsetLocation(candidate).totalScore,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, TERRAIN_ENRICH_LIMIT)
      .map((entry) => entry.key),
  );
  const enriched = await enrichCandidatesWithTerrain(
    candidates.filter((candidate) => strongestKeys.has(getSpotKey(candidate))),
  );
  const enrichedByKey = new Map(
    enriched.map((candidate) => [getSpotKey(candidate), candidate]),
  );

  return {
    candidates: candidates.map(
      (candidate) => enrichedByKey.get(getSpotKey(candidate)) ?? candidate,
    ),
    profileAzimuthDeg: getSunsetAzimuthDegrees(center),
  };
}

async function fetchLiveCandidates(
  center: Coordinate,
  radiusMeters: number,
  limit: number,
): Promise<{
  candidates: SunsetLocationCandidate[];
  passesTried: DiscoveryPassName[];
}> {
  const passes: Array<{ name: DiscoveryPassName; radiusMeters: number }> = [
    {
      name: "high-confidence",
      radiusMeters: Math.min(radiusMeters, HIGH_CONFIDENCE_RADIUS_METERS),
    },
    {
      name: "broad-scenic",
      radiusMeters,
    },
  ];
  // Overpass passes (concurrently) + Google Places (popularity source) all run
  // in parallel. Serial failover across Overpass passes was the main latency sink.
  const [passResults, placesCandidates] = await Promise.all([
    Promise.allSettled(
      passes.map((pass) =>
        fetchOverpassSunsetCandidates(
          center.latitude,
          center.longitude,
          pass.radiusMeters,
          limit * 4,
          pass.name,
        ),
      ),
    ),
    fetchGooglePlacesCandidates(center.latitude, center.longitude, radiusMeters),
  ]);

  // Places candidates go in first so their popularity survives the dedupe merge.
  const candidates: SunsetLocationCandidate[] = [...placesCandidates];
  passResults.forEach((result, index) => {
    if (result.status === "fulfilled") {
      candidates.push(...result.value);
    } else {
      logOverpassFailure(passes[index]!.name, result.reason);
    }
  });

  return {
    candidates: dedupeCandidates(candidates),
    passesTried: [...passes.map((pass) => pass.name), "regional-fallback"],
  };
}

function logOverpassFailure(passName: DiscoveryPassName, error: unknown): void {
  if (error instanceof OverpassRequestError) {
    console.warn(`${passName} Overpass request skipped (${error.status}).`);
    return;
  }

  console.warn(`${passName} location discovery skipped.`);
}

function getDiscoveryCacheKey(
  tileKey: string,
  radiusMeters: number,
  includeTerrain: boolean,
): string {
  return [tileKey, radiusMeters, includeTerrain ? "t" : "n"].join(":");
}

function getResultSource(
  liveCandidateCount: number,
  validatedCandidateCount: number,
): "live-overpass" | "validated-fallback" | "mixed" {
  if (liveCandidateCount > 0 && validatedCandidateCount > 0) {
    return "mixed";
  }

  if (liveCandidateCount > 0) {
    return "live-overpass";
  }

  return "validated-fallback";
}

function dedupeCandidates(
  candidates: SunsetLocationCandidate[],
): SunsetLocationCandidate[] {
  const candidateMap = new Map<string, SunsetLocationCandidate>();

  candidates.forEach((candidate) => {
    const key = getSpotKey(candidate);
    const existingCandidate = candidateMap.get(key);

    if (!existingCandidate) {
      candidateMap.set(key, candidate);
      return;
    }

    candidateMap.set(key, {
      ...existingCandidate,
      ...candidate,
      sources: Array.from(
        new Set([...existingCandidate.sources, ...candidate.sources]),
      ),
      references: [...existingCandidate.references, ...candidate.references],
      photoReferenceCount: Math.max(
        existingCandidate.photoReferenceCount,
        candidate.photoReferenceCount,
      ),
      // Keep the Google Places popularity when an OSM + Places spot merge.
      popularity: candidate.popularity ?? existingCandidate.popularity,
    });
  });

  return Array.from(candidateMap.values());
}

function clampRadius(radiusMeters = DEFAULT_RADIUS_METERS): number {
  if (!Number.isFinite(radiusMeters)) {
    return DEFAULT_RADIUS_METERS;
  }

  return Math.max(1_000, Math.min(Math.round(radiusMeters), MAX_RADIUS_METERS));
}

function clampLimit(limit = DEFAULT_LIMIT): number {
  if (!Number.isFinite(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.max(1, Math.min(Math.round(limit), MAX_LIMIT));
}
