import { getDistanceMeters, type Coordinate } from "./geo";
import { enrichCandidatesWithReferenceImages } from "./mediawiki";
import {
  fetchOverpassSunsetCandidates,
  OverpassRequestError,
} from "./overpass";
import { rankSunsetLocation } from "./ranking";
import { enrichCandidatesWithTerrain } from "./terrain";
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

const discoveryCache = new Map<
  string,
  {
    expiresAt: number;
    result: DiscoverSunsetLocationsResult;
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
  const cacheKey = getDiscoveryCacheKey(
    center,
    radiusMeters,
    limit,
    includeTerrain,
  );
  const cachedResult = discoveryCache.get(cacheKey);

  if (cachedResult && cachedResult.expiresAt > Date.now()) {
    return {
      ...cachedResult.result,
      generatedAt: new Date().toISOString(),
      searchDiagnostics: {
        ...cachedResult.result.searchDiagnostics,
        cacheStatus: "hit",
      },
    };
  }

  const liveSearch = await fetchLiveCandidates(center, radiusMeters, limit);
  const validatedCandidates = getNearbyValidatedCandidates(center, radiusMeters);
  const enrichedCandidates = await enrichCandidatesWithReferenceImages(
    dedupeCandidates([...liveSearch.candidates, ...validatedCandidates]).map(
      mergeValidatedReferences,
    ),
  );
  const terrainEnrichedCandidates = includeTerrain
    ? await enrichCandidatesWithTerrain(enrichedCandidates)
    : enrichedCandidates;
  const candidates = terrainEnrichedCandidates
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
    source: getResultSource(liveSearch.candidates.length, validatedCandidates.length),
    searchDiagnostics: {
      requestedRadiusMeters: options.radiusMeters ?? DEFAULT_RADIUS_METERS,
      effectiveRadiusMeters: radiusMeters,
      passesTried: liveSearch.passesTried,
      liveCandidateCount: liveSearch.candidates.length,
      validatedCandidateCount: validatedCandidates.length,
      cacheStatus: "miss",
      fallbackReason:
        liveSearch.candidates.length === 0
          ? "No live Overpass candidates matched; returned nearby validated seeds when available."
          : null,
    },
  };

  discoveryCache.set(cacheKey, {
    expiresAt: Date.now() + DISCOVERY_CACHE_TTL_MS,
    result,
  });

  return result;
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
  const candidates: SunsetLocationCandidate[] = [];
  const passesTried: DiscoveryPassName[] = [];

  for (const pass of passes) {
    passesTried.push(pass.name);

    try {
      const passCandidates = await fetchOverpassSunsetCandidates(
        center.latitude,
        center.longitude,
        pass.radiusMeters,
        limit * 4,
        pass.name,
      );

      candidates.push(...passCandidates);

      if (dedupeCandidates(candidates).length >= limit) {
        break;
      }
    } catch (error) {
      logOverpassFailure(pass.name, error);
    }
  }

  passesTried.push("regional-fallback");

  return {
    candidates: dedupeCandidates(candidates),
    passesTried,
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
  center: Coordinate,
  radiusMeters: number,
  limit: number,
  includeTerrain: boolean,
): string {
  return [
    center.latitude.toFixed(3),
    center.longitude.toFixed(3),
    radiusMeters,
    limit,
    includeTerrain ? "t" : "n",
  ].join(":");
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
    const key = getCandidateKey(candidate);
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
    });
  });

  return Array.from(candidateMap.values());
}

function getCandidateKey(candidate: SunsetLocationCandidate): string {
  return [
    candidate.name.toLowerCase().replaceAll(/[^a-z0-9]/g, ""),
    candidate.latitude.toFixed(3),
    candidate.longitude.toFixed(3),
  ].join("-");
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
