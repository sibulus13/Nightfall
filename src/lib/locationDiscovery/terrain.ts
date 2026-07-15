import { getPosition, getTimes } from "suncalc";
import { destinationPoint, type Coordinate } from "./geo";
import type { HorizonProfile, SunsetLocationCandidate } from "./types";

/**
 * Terrain enrichment: for each candidate, read the elevation profile along the
 * sunset (west) and anti-solar (east / Belt of Venus) bearings, then derive a
 * range-aware view-quality profile per direction.
 *
 * Range-aware is the whole point: the SAME distant mountain that would block a
 * near horizon is a desirable backdrop when it is far away and low on the sky.
 * So we split the ray into a NEAR band (obstruction → hurts `clearance`) and a
 * FAR band (relief → helps `backdrop`/`relief`).
 *
 * Data source is Open-Meteo's Elevation API — free, no key, and the same
 * provider the app already uses for weather. The whole step degrades
 * gracefully: any failure leaves candidates without `viewProfiles`, and the
 * ranker falls back to its keyword heuristics.
 */

// Distances (metres) sampled outward along each bearing from the observer.
const SAMPLE_DISTANCES_M = [300, 600, 1200, 2500, 5000, 10000, 20000, 30000];
const NEAR_BAND_MAX_M = 3000; // obstruction that hides the phenomenon
const FAR_BAND_MIN_M = 5000; // relief that composes as a backdrop
const EYE_HEIGHT_M = 2;

// Effective Earth radius including standard atmospheric refraction (7/6 R).
const REFRACTED_EARTH_RADIUS_M = 6_371_000 * (7 / 6);

// Near-horizon obstruction (degrees) mapped to clearance: <=2° reads as open,
// >=12° reads as fully blocked.
const CLEARANCE_CLEAR_DEG = 2;
const CLEARANCE_BLOCKED_DEG = 12;

// Distant relief (degrees) mapped to backdrop interest.
const BACKDROP_MIN_DEG = 0.2;
const BACKDROP_FULL_DEG = 2.5;
const BACKDROP_WALL_DEG = 8; // so high even when far → reads as a wall, not backdrop

// Terrain ruggedness (metres of std-dev in the far band) mapped to relief.
const RELIEF_FULL_M = 150;

const OPEN_METEO_ELEVATION_URL = "https://api.open-meteo.com/v1/elevation";
const MAX_COORDS_PER_REQUEST = 100;
const FETCH_TIMEOUT_MS = 8000;

// Retry knobs for transient Open-Meteo failures (rate limits, aborts, blips).
// The outer enrichCandidatesWithTerrain still degrades gracefully on final
// failure; this just reduces how often it has to.
const ELEVATION_MAX_ATTEMPTS = 3;
const ELEVATION_BACKOFF_MS = [500, 1500] as const;

interface CandidateLayout {
  observerIndex: number;
  westStartIndex: number;
  eastStartIndex: number;
}

export async function enrichCandidatesWithTerrain(
  candidates: SunsetLocationCandidate[],
): Promise<SunsetLocationCandidate[]> {
  if (candidates.length === 0) {
    return candidates;
  }

  try {
    const coordinates: Coordinate[] = [];
    const layouts: CandidateLayout[] = candidates.map((candidate) => {
      const origin: Coordinate = {
        latitude: candidate.latitude,
        longitude: candidate.longitude,
      };
      const sunsetAzimuth = getSunsetAzimuthDegrees(origin);
      const antisolarAzimuth = (sunsetAzimuth + 180) % 360;

      const observerIndex = coordinates.length;
      coordinates.push(origin);

      const westStartIndex = coordinates.length;
      for (const distance of SAMPLE_DISTANCES_M) {
        coordinates.push(destinationPoint(origin, sunsetAzimuth, distance));
      }

      const eastStartIndex = coordinates.length;
      for (const distance of SAMPLE_DISTANCES_M) {
        coordinates.push(destinationPoint(origin, antisolarAzimuth, distance));
      }

      return { observerIndex, westStartIndex, eastStartIndex };
    });

    const elevations = await fetchElevations(coordinates);

    return candidates.map((candidate, index) => {
      const layout = layouts[index];
      if (!layout) {
        return candidate;
      }

      const observerElevation = elevations[layout.observerIndex];
      if (observerElevation === undefined) {
        return candidate;
      }

      return {
        ...candidate,
        viewProfiles: {
          west: buildProfile(observerElevation, elevations, layout.westStartIndex),
          east: buildProfile(observerElevation, elevations, layout.eastStartIndex),
        },
      };
    });
  } catch {
    // Graceful degradation — ranker falls back to keyword heuristics.
    return candidates;
  }
}

function buildProfile(
  observerElevation: number,
  elevations: number[],
  startIndex: number,
): HorizonProfile | undefined {
  const nearAngles: number[] = [];
  const farAngles: number[] = [];
  const farReliefs: number[] = [];

  for (let i = 0; i < SAMPLE_DISTANCES_M.length; i++) {
    const distance = SAMPLE_DISTANCES_M[i]!;
    const elevation = elevations[startIndex + i];
    if (elevation === undefined) {
      continue;
    }

    const angle = elevationAngleDegrees(observerElevation, elevation, distance);

    if (distance <= NEAR_BAND_MAX_M) {
      nearAngles.push(angle);
    }
    if (distance >= FAR_BAND_MIN_M) {
      farAngles.push(angle);
      farReliefs.push(elevation - observerElevation);
    }
  }

  if (nearAngles.length === 0 && farAngles.length === 0) {
    return undefined;
  }

  const maxNearAngle = nearAngles.length > 0 ? Math.max(...nearAngles) : 0;
  const clearance =
    1 - smoothstep(CLEARANCE_CLEAR_DEG, CLEARANCE_BLOCKED_DEG, maxNearAngle);

  const maxFarAngle = farAngles.length > 0 ? Math.max(...farAngles) : 0;
  let backdrop = smoothstep(BACKDROP_MIN_DEG, BACKDROP_FULL_DEG, maxFarAngle);
  if (maxFarAngle > BACKDROP_WALL_DEG) {
    backdrop *= 0.5; // distant wall, not a composable backdrop
  }

  const relief = clamp01(standardDeviation(farReliefs) / RELIEF_FULL_M);

  return { clearance, backdrop, relief };
}

/** Apparent elevation angle (degrees) of a distant point, curvature-corrected. */
function elevationAngleDegrees(
  observerElevation: number,
  sampleElevation: number,
  distanceMeters: number,
): number {
  const curvatureDrop =
    (distanceMeters * distanceMeters) / (2 * REFRACTED_EARTH_RADIUS_M);
  const apparentHeight =
    sampleElevation - (observerElevation + EYE_HEIGHT_M) - curvatureDrop;

  return Math.atan2(apparentHeight, distanceMeters) * (180 / Math.PI);
}

async function fetchElevations(coordinates: Coordinate[]): Promise<number[]> {
  const elevations: number[] = [];

  for (let i = 0; i < coordinates.length; i += MAX_COORDS_PER_REQUEST) {
    const chunk = coordinates.slice(i, i + MAX_COORDS_PER_REQUEST);
    const latitudes = chunk.map((c) => c.latitude.toFixed(6)).join(",");
    const longitudes = chunk.map((c) => c.longitude.toFixed(6)).join(",");
    const url = `${OPEN_METEO_ELEVATION_URL}?latitude=${latitudes}&longitude=${longitudes}`;

    elevations.push(...(await fetchElevationChunk(url, chunk.length)));
  }

  return elevations;
}

/**
 * Fetch one coordinate chunk with a per-request AbortController timeout and
 * exponential-backoff retries on any transient failure (non-ok, abort, or an
 * unexpected body). Throws the last error once retries are exhausted.
 */
async function fetchElevationChunk(
  url: string,
  expectedLength: number,
): Promise<number[]> {
  let lastError: unknown;

  for (let attempt = 0; attempt < ELEVATION_MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Elevation API error: ${response.status}`);
      }
      const data = (await response.json()) as { elevation?: number[] };
      if (!data.elevation || data.elevation.length !== expectedLength) {
        throw new Error("Elevation API returned an unexpected shape");
      }
      return data.elevation;
    } catch (error) {
      lastError = error;
      const backoffMs = ELEVATION_BACKOFF_MS[attempt];
      if (backoffMs !== undefined) {
        await delay(backoffMs);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Elevation request failed");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSunsetAzimuthDegrees(origin: Coordinate): number {
  // Reference date is fine — the sunset azimuth moves slowly and horizon
  // geometry is static; we only need the compass direction to sample along.
  const times = getTimes(new Date(), origin.latitude, origin.longitude) as {
    sunset: Date;
  };
  const position = getPosition(
    times.sunset,
    origin.latitude,
    origin.longitude,
  ) as { azimuth: number };

  // suncalc azimuth is measured from due south, clockwise; +180 → compass north.
  const compass = position.azimuth * (180 / Math.PI) + 180;
  return ((compass % 360) + 360) % 360;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
