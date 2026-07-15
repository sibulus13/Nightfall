import type {
  CandidateKind,
  DiscoveryRegion,
  DiscoveryPassName,
  SunsetLocationCandidate,
} from "./types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const DEFAULT_DISCOVERY_LIMIT = 50;
const OSM_TIMEOUT_SECONDS = 8;
const UNKNOWN_REGION: DiscoveryRegion = "unknown";

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

export class OverpassRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "OverpassRequestError";
  }
}

export async function fetchOverpassSunsetCandidates(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  limit = DEFAULT_DISCOVERY_LIMIT,
  passName: DiscoveryPassName = "high-confidence",
): Promise<SunsetLocationCandidate[]> {
  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      // Overpass rejects UA-less requests with 406; without this the app
      // silently fell back to the BC-only validated list everywhere.
      "User-Agent": "Nightfalls-Sunset/1.0 (+https://nightfalls.app)",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      data: buildOverpassQuery(
        latitude,
        longitude,
        radiusMeters,
        limit,
        passName,
      ),
    }),
    next: {
      revalidate: 60 * 60 * 24,
    },
  });

  if (!response.ok) {
    throw new OverpassRequestError(
      `Overpass request failed with status ${response.status}`,
      response.status,
    );
  }

  const data = (await response.json()) as OverpassResponse;

  return (data.elements ?? [])
    .map(mapOverpassElementToCandidate)
    .filter(
      (candidate): candidate is SunsetLocationCandidate => candidate !== null,
    );
}

function buildOverpassQuery(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  limit: number,
  passName: DiscoveryPassName,
): string {
  const around = `${radiusMeters},${latitude},${longitude}`;

  if (passName === "broad-scenic") {
    return `
[out:json][timeout:${OSM_TIMEOUT_SECONDS}];
(
  node(around:${around})["tourism"~"^(viewpoint|attraction|picnic_site)$"];
  way(around:${around})["tourism"~"^(viewpoint|attraction|picnic_site)$"];
  relation(around:${around})["tourism"~"^(viewpoint|attraction|picnic_site)$"];
  node(around:${around})["leisure"~"^(park|nature_reserve|marina)$"];
  way(around:${around})["leisure"~"^(park|nature_reserve|marina)$"];
  relation(around:${around})["leisure"~"^(park|nature_reserve|marina)$"];
  node(around:${around})["natural"~"^(beach|peak|cliff|bay|water|wood)$"];
  way(around:${around})["natural"~"^(beach|peak|cliff|bay|water|wood)$"];
  relation(around:${around})["natural"~"^(beach|peak|cliff|bay|water|wood)$"];
  node(around:${around})["water"~"^(lake|pond|reservoir|basin)$"];
  way(around:${around})["water"~"^(lake|pond|reservoir|basin)$"];
  relation(around:${around})["water"~"^(lake|pond|reservoir|basin)$"];
  node(around:${around})["waterway"~"^(river|stream)$"];
  way(around:${around})["waterway"~"^(river|stream)$"];
  relation(around:${around})["waterway"~"^(river|stream)$"];
  node(around:${around})["highway"~"^(path|footway|cycleway)$"]["name"~"(View|Lookout|Point|Shore|Dyke|Dike|Beach|Pier|Lake|Inlet|River|Mountain|Ridge)",i];
  way(around:${around})["highway"~"^(path|footway|cycleway)$"]["name"~"(View|Lookout|Point|Shore|Dyke|Dike|Beach|Pier|Lake|Inlet|River|Mountain|Ridge)",i];
  relation(around:${around})["highway"~"^(path|footway|cycleway)$"]["name"~"(View|Lookout|Point|Shore|Dyke|Dike|Beach|Pier|Lake|Inlet|River|Mountain|Ridge)",i];
  node(around:${around})["name"~"(View|Lookout|Point|Shore|Dyke|Dike|Beach|Pier|Lake|Inlet|River|Mountain|Ridge|Marine|Waterfront)",i];
  way(around:${around})["name"~"(View|Lookout|Point|Shore|Dyke|Dike|Beach|Pier|Lake|Inlet|River|Mountain|Ridge|Marine|Waterfront)",i];
  relation(around:${around})["name"~"(View|Lookout|Point|Shore|Dyke|Dike|Beach|Pier|Lake|Inlet|River|Mountain|Ridge|Marine|Waterfront)",i];
);
out center ${limit};
`.trim();
  }

  return `
[out:json][timeout:${OSM_TIMEOUT_SECONDS}];
(
  node(around:${around})["tourism"="viewpoint"];
  way(around:${around})["tourism"="viewpoint"];
  relation(around:${around})["tourism"="viewpoint"];
  node(around:${around})["natural"~"^(beach|peak|cliff|bay)$"];
  way(around:${around})["natural"~"^(beach|peak|cliff|bay)$"];
  relation(around:${around})["natural"~"^(beach|peak|cliff|bay)$"];
  node(around:${around})["leisure"="park"];
  way(around:${around})["leisure"="park"];
  relation(around:${around})["leisure"="park"];
  node(around:${around})["man_made"~"^(pier|lighthouse)$"];
  way(around:${around})["man_made"~"^(pier|lighthouse)$"];
  relation(around:${around})["man_made"~"^(pier|lighthouse)$"];
  node(around:${around})["tower:type"="observation"];
  way(around:${around})["tower:type"="observation"];
  relation(around:${around})["tower:type"="observation"];
);
out center ${limit};
`.trim();
}

function mapOverpassElementToCandidate(
  element: OverpassElement,
): SunsetLocationCandidate | null {
  const tags = element.tags ?? {};
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;

  if (latitude === undefined || longitude === undefined) {
    return null;
  }

  const name = tags.name ?? getFallbackName(tags);
  const kind = getCandidateKind(tags);
  const scenicTags = getScenicTags(tags);

  return {
    id: `osm-${element.type}-${element.id}`,
    name,
    region: UNKNOWN_REGION,
    kind,
    latitude,
    longitude,
    sources: ["osm-overpass"],
    scenicTags,
    directionHint: tags.direction,
    hasWaterView: hasWaterSignal(tags),
    hasElevation: hasElevationSignal(tags),
    publicAccess: tags.access !== "private" && tags.access !== "no",
    photoReferenceCount: 0,
    references: [],
  };
}

function getFallbackName(tags: Record<string, string>): string {
  if (tags.tourism === "viewpoint") {
    return "Unnamed viewpoint";
  }

  if (tags.natural === "beach") {
    return "Unnamed beach";
  }

  if (tags.leisure === "park") {
    return "Unnamed park";
  }

  if (tags.highway === "path" || tags.highway === "footway") {
    return "Unnamed trail";
  }

  if (tags.man_made === "pier") {
    return "Unnamed pier";
  }

  return "Promising sunset spot";
}

function getCandidateKind(tags: Record<string, string>): CandidateKind {
  if (tags.man_made === "lighthouse") {
    return "lighthouse";
  }

  if (tags.tourism === "viewpoint" || tags["tower:type"] === "observation") {
    return "viewpoint";
  }

  if (tags.natural === "beach") {
    return "beach";
  }

  if (tags.natural === "bay" || tags.man_made === "pier") {
    return "waterfront";
  }

  if (
    tags.water !== undefined ||
    tags.waterway !== undefined ||
    tags.leisure === "marina"
  ) {
    return "waterfront";
  }

  if (tags.natural === "peak" || tags.natural === "cliff") {
    return "elevated-park";
  }

  if (tags.highway === "path" || tags.highway === "footway") {
    return "trail";
  }

  return "park";
}

function getScenicTags(tags: Record<string, string>): string[] {
  return Object.entries(tags)
    .filter(([key]) =>
      [
        "tourism",
        "natural",
        "leisure",
        "man_made",
        "tower:type",
        "water",
        "waterway",
        "highway",
      ].includes(key),
    )
    .map(([key, value]) => `${key}=${value}`);
}

function hasWaterSignal(tags: Record<string, string>): boolean {
  return (
    tags.natural === "beach" ||
    tags.natural === "bay" ||
    tags.man_made === "pier" ||
    tags.waterway !== undefined ||
    tags.water !== undefined
  );
}

function hasElevationSignal(tags: Record<string, string>): boolean {
  return (
    tags.natural === "peak" ||
    tags.natural === "cliff" ||
    tags["tower:type"] === "observation" ||
    tags.ele !== undefined
  );
}
