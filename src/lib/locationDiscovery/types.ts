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
  cacheStatus: "hit" | "miss";
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
