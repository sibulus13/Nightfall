export type DiscoveryRegion =
  | "vancouver-bc"
  | "surrey-bc"
  | "coquitlam-bc"
  | "unknown";

export type DiscoverySource =
  | "osm-overpass"
  | "google-places"
  | "open-photo"
  | "web-validation";

export type CandidateKind =
  | "beach"
  | "viewpoint"
  | "park"
  | "lighthouse"
  | "waterfront"
  | "elevated-park"
  | "trail";

export type ConfirmationStrength = "strong" | "medium" | "weak";

export interface LocationReference {
  title: string;
  url: string;
  source: DiscoverySource;
  strength: ConfirmationStrength;
  confirms: string[];
}

export interface LocationReferenceImage {
  title: string;
  pageUrl: string;
  thumbnailUrl?: string;
  attribution?: string;
  license?: string;
}

/**
 * Terrain-derived view quality in one compass direction, from a range-aware
 * horizon read (Open-Meteo elevation). All fields are 0-1.
 * - `clearance`: is the NEAR sightline open enough to see the phenomenon? (a gate)
 * - `backdrop`:  is there DISTANT relief/silhouette to compose against? (contrast)
 * - `relief`:    how varied/rugged is the terrain in view? (landscape variety)
 */
export interface HorizonProfile {
  clearance: number;
  backdrop: number;
  relief: number;
}

export interface SunsetLocationCandidate {
  id: string;
  name: string;
  region: DiscoveryRegion;
  kind: CandidateKind;
  latitude: number;
  longitude: number;
  sources: DiscoverySource[];
  scenicTags: string[];
  directionHint?: string;
  hasWaterView: boolean;
  hasElevation: boolean;
  publicAccess: boolean;
  photoReferenceCount: number;
  references: LocationReference[];
  referenceImages?: LocationReferenceImage[];
  /**
   * Directional view-quality profiles, attached by the async terrain
   * enrichment step. Absent when terrain lookup was skipped or failed —
   * the ranker falls back to keyword heuristics in that case.
   * `west` = sunset azimuth, `east` = anti-solar (Belt of Venus) azimuth.
   */
  viewProfiles?: {
    west?: HorizonProfile;
    east?: HorizonProfile;
  };
  /**
   * Human-curated popularity from Google Places (rating 0-5 + review count).
   * Present only for `google-places` candidates; boosts ranking so well-known
   * spots (e.g. famous viewpoints) surface above generic tagged POIs.
   */
  popularity?: {
    rating: number;
    count: number;
  };
}

export interface RankedSunsetLocation extends SunsetLocationCandidate {
  recommendationMetrics: Array<{
    key: string;
    label: string;
    score: number;
    weight: number;
  }>;
  scenicScore: number;
  westwardViewScore: number;
  accessibilityScore: number;
  referenceScore: number;
  viewQualityScore: number;
  qualificationBadges: string[];
  searchTags: string[];
  goldenHour: {
    start: string;
    end: string;
    arriveBy: string;
  };
  phaseScores: {
    goldenHour: number;
    sunDisk: number;
    beltOfVenus: number;
    civilTwilight: number;
    blueHour: number;
  };
  bestPhase: "goldenHour" | "sunDisk" | "beltOfVenus" | "civilTwilight" | "blueHour";
  recommendedFor: string[];
  viewingDirections: {
    sunsetAzimuthDegrees: number;
    antisolarAzimuthDegrees: number;
    sideLightAzimuthDegrees: [number, number];
  };
  totalScore: number;
  confirmedByGoldenSource: boolean;
}

export type DiscoveryPassName =
  | "high-confidence"
  | "broad-scenic"
  | "regional-fallback";

export interface DiscoverySearchDiagnostics {
  requestedRadiusMeters: number;
  effectiveRadiusMeters: number;
  passesTried: DiscoveryPassName[];
  liveCandidateCount: number;
  validatedCandidateCount: number;
  /**
   * `hit` = process memory, `database` = durable spot store (external sources
   * already paid for), `miss` = a live sweep was run.
   */
  cacheStatus: "hit" | "miss" | "database";
  fallbackReason: string | null;
}

export interface SourceEfficiencyProfile {
  source: DiscoverySource;
  candidateCount: number;
  confirmedCandidateCount: number;
  estimatedRequestCount: number;
  requiresApiKey: boolean;
  canCacheCandidateData: boolean;
  canCacheImages: boolean;
  medianConfidence: number;
  notes: string;
}

export interface DiscoveryEvaluation {
  region: DiscoveryRegion;
  rankedCandidates: RankedSunsetLocation[];
  sourceProfiles: SourceEfficiencyProfile[];
}
