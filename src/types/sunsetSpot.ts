export interface SunsetSpotReference {
  title: string;
  url: string;
  strength: "strong" | "medium" | "weak";
  confirms: string[];
}

export interface SunsetSpotImage {
  title: string;
  pageUrl: string;
  thumbnailUrl?: string;
  attribution?: string;
  license?: string;
}

export interface SunsetSpot {
  id: string;
  name: string;
  kind: string;
  latitude: number;
  longitude: number;
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
  references: SunsetSpotReference[];
  referenceImages?: SunsetSpotImage[];
}

export interface SunsetSpotResponse {
  center: {
    latitude: number;
    longitude: number;
  };
  radiusMeters: number;
  generatedAt: string;
  candidates: SunsetSpot[];
  source: "live-overpass" | "validated-fallback" | "mixed";
  searchDiagnostics: {
    requestedRadiusMeters: number;
    effectiveRadiusMeters: number;
    passesTried: Array<
      "high-confidence" | "broad-scenic" | "regional-fallback"
    >;
    liveCandidateCount: number;
    validatedCandidateCount: number;
    cacheStatus: "hit" | "miss";
    fallbackReason: string | null;
  };
}
