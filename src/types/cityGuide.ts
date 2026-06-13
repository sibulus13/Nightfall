import type { RankedSunsetLocation } from "~/lib/locationDiscovery/types";

export interface CityGuideRequest {
  cityName: string;
  latitude: number;
  longitude: number;
}

export interface CityGuideFeedbackRequest {
  guideId: string;
  rating: "up" | "down";
}

export interface CityGuide {
  id: string;
  cityName: string;
  latitude: number;
  longitude: number;
  generatedAt: string;
  expiresAt: string;
  source: "gemini" | "fallback" | "cache";
  cacheStatus: "hit" | "miss";
  summary: string;
  bestTimes: string[];
  scoutingTips: string[];
  recommendedSpots: Array<
    Pick<
      RankedSunsetLocation,
      | "id"
      | "name"
      | "kind"
      | "latitude"
      | "longitude"
      | "qualificationBadges"
      | "recommendedFor"
      | "bestPhase"
      | "goldenHour"
      | "references"
      | "referenceImages"
    >
  >;
}

export interface CityGuideFeedbackResponse {
  ok: true;
  guideId: string;
  rating: "up" | "down";
}
