import type {
  CandidateKind,
  DiscoveryRegion,
  SunsetLocationCandidate,
} from "./types";

/**
 * Google Places (New) as a discovery source: a text search for scenic
 * viewpoints near the location, carrying each place's rating + review count as
 * a `popularity` signal. This surfaces well-known sunset spots (e.g. Kerry Park
 * in Seattle) that OSM tags alone under-rank, since OSM has no popularity.
 *
 * Server-side only: reads `GOOGLE_PLACES_API_KEY` (never exposed to the client).
 * Degrades gracefully — no key, a disabled API, or any error returns [], leaving
 * OSM-only discovery unchanged.
 */

const PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK =
  "places.id,places.displayName,places.location,places.rating,places.userRatingCount,places.types";
const REQUEST_TIMEOUT_MS = 8000;
const MAX_RESULTS = 15;
const MAX_RADIUS_METERS = 50_000; // Places locationBias circle cap
const UNKNOWN_REGION: DiscoveryRegion = "unknown";

interface PlacesTextSearchResponse {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    location?: { latitude?: number; longitude?: number };
    rating?: number;
    userRatingCount?: number;
    types?: string[];
  }>;
}

export async function fetchGooglePlacesCandidates(
  latitude: number,
  longitude: number,
  radiusMeters: number,
): Promise<SunsetLocationCandidate[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return [];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(PLACES_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: "sunset viewpoint",
        locationBias: {
          circle: {
            center: { latitude, longitude },
            radius: Math.min(radiusMeters, MAX_RADIUS_METERS),
          },
        },
        maxResultCount: MAX_RESULTS,
      }),
      signal: controller.signal,
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as PlacesTextSearchResponse;
    return (data.places ?? [])
      .map(mapPlaceToCandidate)
      .filter((candidate): candidate is SunsetLocationCandidate => candidate !== null);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function mapPlaceToCandidate(
  place: NonNullable<PlacesTextSearchResponse["places"]>[number],
): SunsetLocationCandidate | null {
  const latitude = place.location?.latitude;
  const longitude = place.location?.longitude;
  const name = place.displayName?.text;
  if (
    latitude === undefined ||
    longitude === undefined ||
    !name ||
    !place.id
  ) {
    return null;
  }

  const types = place.types ?? [];

  return {
    id: `gplaces-${place.id}`,
    name,
    region: UNKNOWN_REGION,
    kind: inferKind(types, name),
    latitude,
    longitude,
    sources: ["google-places"],
    scenicTags: types,
    hasWaterView: hasWaterSignal(types, name),
    hasElevation: hasElevationSignal(types, name),
    publicAccess: true,
    photoReferenceCount: 0,
    references: [],
    popularity:
      typeof place.rating === "number" &&
      typeof place.userRatingCount === "number"
        ? { rating: place.rating, count: place.userRatingCount }
        : undefined,
  };
}

function inferKind(types: string[], name: string): CandidateKind {
  const haystack = `${types.join(" ")} ${name}`.toLowerCase();
  if (haystack.includes("beach")) return "beach";
  if (/pier|marina|harbou?r|waterfront/.test(haystack)) return "waterfront";
  if (haystack.includes("lighthouse")) return "lighthouse";
  if (/peak|mountain|hill|summit|ridge|cliff/.test(haystack)) return "elevated-park";
  if (/trail|path/.test(haystack)) return "trail";
  if (/park|garden/.test(haystack)) return "park";
  return "viewpoint";
}

function hasWaterSignal(types: string[], name: string): boolean {
  const haystack = `${types.join(" ")} ${name}`.toLowerCase();
  return /beach|bay|pier|marina|harbou?r|waterfront|lake|river|ocean|sea|inlet/.test(
    haystack,
  );
}

function hasElevationSignal(types: string[], name: string): boolean {
  const haystack = `${types.join(" ")} ${name}`.toLowerCase();
  return /peak|mountain|hill|summit|ridge|cliff|lookout|overlook|vista|view/.test(
    haystack,
  );
}
