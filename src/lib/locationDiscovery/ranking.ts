import type {
  DiscoveryEvaluation,
  DiscoveryRegion,
  DiscoverySource,
  HorizonProfile,
  RankedSunsetLocation,
  SourceEfficiencyProfile,
  SunsetLocationCandidate,
} from "./types";
import { getPosition, getTimes } from "suncalc";

const SCORE_MAX = 100;
const WATER_VIEW_BONUS = 18;
const ELEVATION_BONUS = 14;
const VIEWPOINT_TAG_BONUS = 28;
const BEACH_TAG_BONUS = 24;
const PARK_TAG_BONUS = 14;
const LIGHTHOUSE_TAG_BONUS = 18;
const TRAIL_TAG_BONUS = 8;
const NAMED_SCENIC_BONUS = 10;
const WESTWARD_DIRECTION_BONUS = 30;
const PANORAMA_DIRECTION_BONUS = 20;
const IMPLIED_WESTERN_WATER_BONUS = 18;
const PUBLIC_ACCESS_SCORE = 100;
const PRIVATE_ACCESS_SCORE = 20;
const STRONG_REFERENCE_SCORE = 34;
const MEDIUM_REFERENCE_SCORE = 21;
const WEAK_REFERENCE_SCORE = 10;
const PHOTO_REFERENCE_SCORE = 8;
const SOURCE_REQUEST_BASELINE = 1;
const BADGE_POPULAR = "Popular";
const BADGE_HIGH_VANTAGE = "High vantage";
const BADGE_WESTERN_EXPOSURE = "Western exposure";
const BADGE_WIDE_HORIZON = "Wide horizon";
const BADGE_WATER_REFLECTION = "Water reflection";
const BADGE_FOREGROUND_INTEREST = "Foreground interest";
const BADGE_SEASONAL_SCOUT = "Seasonal scout";
const BADGE_VALIDATED_REFERENCE = "Validated reference";
const ARRIVAL_BUFFER_MINUTES = 45;
const MINUTE_MS = 60 * 1000;
const PHASE_RECOMMENDATION_THRESHOLD = 64;

const sourceRequestEstimate: Record<DiscoverySource, number> = {
  "osm-overpass": 1,
  "google-places": 3,
  "open-photo": 2,
  "web-validation": 6,
};

const sourceRequiresApiKey: Record<DiscoverySource, boolean> = {
  "osm-overpass": false,
  "google-places": true,
  "open-photo": true,
  "web-validation": false,
};

const sourceCanCacheImages: Record<DiscoverySource, boolean> = {
  "osm-overpass": false,
  "google-places": false,
  "open-photo": true,
  "web-validation": false,
};

export function rankSunsetLocation(
  candidate: SunsetLocationCandidate,
): RankedSunsetLocation {
  const scenicScore = scoreScenicValue(candidate);
  const westwardViewScore = scoreWestwardView(candidate);
  const accessibilityScore = candidate.publicAccess
    ? PUBLIC_ACCESS_SCORE
    : PRIVATE_ACCESS_SCORE;
  const referenceScore = scoreReferences(candidate);
  const viewQualityScore = scoreViewQuality(
    candidate,
    scenicScore,
    westwardViewScore,
  );
  const qualificationBadges = getQualificationBadges(
    candidate,
    viewQualityScore,
    referenceScore,
  );
  const searchTags = getSearchTags(candidate, qualificationBadges);
  const goldenHour = getGoldenHourRecommendation(candidate);
  const viewingDirections = getViewingDirections(candidate);
  const phaseScores = getPhaseScores({
    accessibilityScore,
    candidate,
    referenceScore,
    scenicScore,
    viewQualityScore,
    westwardViewScore,
  });
  const bestPhase = getBestPhase(phaseScores);
  const recommendedFor = getRecommendedFor(phaseScores);
  const recommendationMetrics = getRecommendationMetrics({
    accessibilityScore,
    candidate,
    referenceScore,
    scenicScore,
    viewQualityScore,
    westwardViewScore,
  });
  const totalScore = Math.round(
    scenicScore * 0.24 +
      westwardViewScore * 0.20 +
      viewQualityScore * 0.24 +
      accessibilityScore * 0.14 +
      referenceScore * 0.18,
  );

  return {
    ...candidate,
    recommendationMetrics,
    scenicScore,
    westwardViewScore,
    accessibilityScore,
    referenceScore,
    viewQualityScore,
    qualificationBadges,
    searchTags,
    goldenHour,
    phaseScores,
    bestPhase,
    recommendedFor,
    viewingDirections,
    totalScore,
    confirmedByGoldenSource: referenceScore >= MEDIUM_REFERENCE_SCORE,
  };
}

function getPhaseScores({
  accessibilityScore,
  candidate,
  referenceScore,
  scenicScore,
  viewQualityScore,
  westwardViewScore,
}: {
  accessibilityScore: number;
  candidate: SunsetLocationCandidate;
  referenceScore: number;
  scenicScore: number;
  viewQualityScore: number;
  westwardViewScore: number;
}): RankedSunsetLocation["phaseScores"] {
  const horizonScore = hasOpenHorizonSignal(candidate) ? 84 : 36;
  const reflectionScore = candidate.hasWaterView ? 88 : 26;
  const vantageScore = candidate.hasElevation || candidate.kind === "elevated-park" ? 86 : 34;
  const foregroundScore = hasForegroundSignal(candidate) ? 78 : 42;
  const cityLightScore = hasCityLightSignal(candidate) ? 82 : 36;
  const varietyScore = getVarietyScore(candidate);

  // Directional view quality from terrain (clearance-gated backdrop/relief).
  // Falls back to keyword heuristics when terrain enrichment is unavailable.
  // Belt of Venus reads the EAST (anti-solar) horizon; sunset phases read WEST.
  const eastViewScore = directionalViewScore(
    candidate.viewProfiles?.east,
    horizonScore,
  );
  const westFallbackScore = clampScore(0.6 * horizonScore + westwardViewScore);
  const westViewScore = directionalViewScore(
    candidate.viewProfiles?.west,
    westFallbackScore,
  );

  return {
    goldenHour: clampScore(
      scenicScore * 0.24 +
        westViewScore * 0.22 +
        foregroundScore * 0.18 +
        reflectionScore * 0.16 +
        varietyScore * 0.10 +
        accessibilityScore * 0.10,
    ),
    sunDisk: clampScore(
      westViewScore * 0.40 +
        vantageScore * 0.18 +
        scenicScore * 0.16 +
        varietyScore * 0.14 +
        accessibilityScore * 0.12,
    ),
    beltOfVenus: clampScore(
      eastViewScore * 0.42 +
        vantageScore * 0.16 +
        varietyScore * 0.16 +
        viewQualityScore * 0.14 +
        referenceScore * 0.12,
    ),
    civilTwilight: clampScore(
      foregroundScore * 0.26 +
        reflectionScore * 0.22 +
        accessibilityScore * 0.20 +
        viewQualityScore * 0.18 +
        cityLightScore * 0.14,
    ),
    blueHour: clampScore(
      reflectionScore * 0.26 +
        cityLightScore * 0.24 +
        foregroundScore * 0.20 +
        accessibilityScore * 0.18 +
        viewQualityScore * 0.12,
    ),
  };
}

function getBestPhase(
  phaseScores: RankedSunsetLocation["phaseScores"],
): RankedSunsetLocation["bestPhase"] {
  return (Object.entries(phaseScores).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "goldenHour") as RankedSunsetLocation["bestPhase"];
}

function getRecommendedFor(
  phaseScores: RankedSunsetLocation["phaseScores"],
): string[] {
  const phaseLabels: Record<RankedSunsetLocation["bestPhase"], string> = {
    goldenHour: "Golden hour",
    sunDisk: "Sun disk",
    beltOfVenus: "Belt of Venus",
    civilTwilight: "Civil twilight",
    blueHour: "Blue hour",
  };

  return Object.entries(phaseScores)
    .filter(([, score]) => score >= PHASE_RECOMMENDATION_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .map(([phase]) => phaseLabels[phase as RankedSunsetLocation["bestPhase"]])
    .slice(0, 3);
}

function getViewingDirections(
  candidate: SunsetLocationCandidate,
): RankedSunsetLocation["viewingDirections"] {
  const times = getTypedSunTimes(
    new Date(),
    candidate.latitude,
    candidate.longitude,
  );
  const position = getTypedSunPosition(
    times.sunset,
    candidate.latitude,
    candidate.longitude,
  );
  const sunsetAzimuthDegrees = normalizeDegrees(
    radiansToCompassDegrees(position.azimuth),
  );

  return {
    sunsetAzimuthDegrees,
    antisolarAzimuthDegrees: normalizeDegrees(sunsetAzimuthDegrees + 180),
    sideLightAzimuthDegrees: [
      normalizeDegrees(sunsetAzimuthDegrees - 90),
      normalizeDegrees(sunsetAzimuthDegrees + 90),
    ],
  };
}

function getRecommendationMetrics({
  accessibilityScore,
  candidate,
  referenceScore,
  scenicScore,
  viewQualityScore,
  westwardViewScore,
}: {
  accessibilityScore: number;
  candidate: SunsetLocationCandidate;
  referenceScore: number;
  scenicScore: number;
  viewQualityScore: number;
  westwardViewScore: number;
}): RankedSunsetLocation["recommendationMetrics"] {
  const reflectionScore = candidate.hasWaterView ? 86 : 28;
  const vantageScore = candidate.hasElevation ? 84 : candidate.kind === "elevated-park" ? 76 : 34;
  const foregroundScore = hasForegroundSignal(candidate) ? 78 : 42;
  const phaseFitScore = Math.round(
    viewQualityScore * 0.45 +
      reflectionScore * 0.20 +
      foregroundScore * 0.20 +
      vantageScore * 0.15,
  );

  return [
    {
      key: "phase-fit",
      label: "Phase fit",
      score: Math.min(phaseFitScore, SCORE_MAX),
      weight: 0.22,
    },
    {
      key: "view-quality",
      label: "View quality",
      score: viewQualityScore,
      weight: 0.22,
    },
    {
      key: "direction-fit",
      label: "Direction fit",
      score: westwardViewScore,
      weight: 0.16,
    },
    {
      key: "sky-color-potential",
      label: "Sky color",
      score: scenicScore,
      weight: 0.14,
    },
    {
      key: "foreground-interest",
      label: "Foreground",
      score: foregroundScore,
      weight: 0.10,
    },
    {
      key: "reflection-potential",
      label: "Reflection",
      score: reflectionScore,
      weight: 0.08,
    },
    {
      key: "access-confidence",
      label: "Access",
      score: accessibilityScore,
      weight: 0.05,
    },
    {
      key: "source-confidence",
      label: "Confidence",
      score: referenceScore,
      weight: 0.03,
    },
  ];
}

function getGoldenHourRecommendation(candidate: SunsetLocationCandidate): {
  start: string;
  end: string;
  arriveBy: string;
} {
  const times = getTypedSunTimes(
    new Date(),
    candidate.latitude,
    candidate.longitude,
  );
  const start = times.goldenHour;
  const end = times.sunset;
  const arriveBy = new Date(start.getTime() - ARRIVAL_BUFFER_MINUTES * MINUTE_MS);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    arriveBy: arriveBy.toISOString(),
  };
}

function getTypedSunTimes(
  date: Date,
  latitude: number,
  longitude: number,
): {
  goldenHour: Date;
  sunset: Date;
} {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const times = getTimes(date, latitude, longitude) as {
    goldenHour: Date;
    sunset: Date;
  };

  return times;
}

function getTypedSunPosition(
  date: Date,
  latitude: number,
  longitude: number,
): {
  azimuth: number;
} {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const position = getPosition(date, latitude, longitude) as {
    azimuth: number;
  };

  return position;
}

function getSearchTags(
  candidate: SunsetLocationCandidate,
  qualificationBadges: string[],
): string[] {
  const tagValues = candidate.scenicTags.flatMap((tag) => {
    const [key, value] = tag.split("=");

    return [key, value].filter((entry): entry is string => Boolean(entry));
  });

  const rawTags = [
    candidate.kind,
    ...tagValues,
    ...qualificationBadges,
    ...getRecommendedFor(getPhaseScores({
      accessibilityScore: candidate.publicAccess ? PUBLIC_ACCESS_SCORE : PRIVATE_ACCESS_SCORE,
      candidate,
      referenceScore: scoreReferences(candidate),
      scenicScore: scoreScenicValue(candidate),
      viewQualityScore: scoreViewQuality(
        candidate,
        scoreScenicValue(candidate),
        scoreWestwardView(candidate),
      ),
      westwardViewScore: scoreWestwardView(candidate),
    })),
    candidate.hasWaterView ? "Water view" : "",
    candidate.hasElevation ? "Elevation" : "",
  ];

  return Array.from(
    new Set(
      rawTags
        .map((tag) => normalizeTagLabel(tag))
        .filter((tag): tag is string => tag.length > 0),
    ),
  ).slice(0, 10);
}

function hasCityLightSignal(candidate: SunsetLocationCandidate): boolean {
  const joinedSignals = `${candidate.name} ${candidate.kind} ${candidate.scenicTags.join(" ")}`;

  return /\b(city|skyline|bridge|pier|marina|harbour|harbor|waterfront|park|plaza|quay|village|downtown)\b/i.test(
    joinedSignals,
  );
}

function clampScore(score: number): number {
  return Math.round(Math.max(0, Math.min(score, SCORE_MAX)));
}

/**
 * Directional view quality (0-100) from a terrain horizon profile.
 * `clearance` acts as a GATE (a blocked near horizon tanks the score — you
 * can't see the phenomenon), while `backdrop` and `relief` DIFFERENTIATE:
 * an open-but-empty horizon scores ~55, a clear horizon framed by distant
 * relief approaches 100. Falls back to a keyword-derived score when terrain
 * data is unavailable.
 */
function directionalViewScore(
  profile: HorizonProfile | undefined,
  fallbackScore: number,
): number {
  if (!profile) {
    return fallbackScore;
  }
  const composition = 0.55 + 0.28 * profile.backdrop + 0.17 * profile.relief;
  return clampScore(SCORE_MAX * profile.clearance * composition);
}

/**
 * Landscape variety (0-100): how many distinct scene elements co-occur
 * (water, elevation, foreground subject, city lights, open horizon), blended
 * with terrain ruggedness in view. A monotone scene scores low even when
 * technically "clear"; a varied one — water + relief + skyline — scores high.
 */
function getVarietyScore(candidate: SunsetLocationCandidate): number {
  const elementSignals = [
    candidate.hasWaterView,
    candidate.hasElevation,
    hasForegroundSignal(candidate),
    hasCityLightSignal(candidate),
    hasOpenHorizonSignal(candidate),
  ];
  const diversityScore =
    (elementSignals.filter(Boolean).length / elementSignals.length) * SCORE_MAX;

  const relief = Math.max(
    candidate.viewProfiles?.east?.relief ?? 0,
    candidate.viewProfiles?.west?.relief ?? 0,
  );

  return clampScore(0.7 * diversityScore + 0.3 * (relief * SCORE_MAX));
}

function radiansToCompassDegrees(azimuthRadians: number): number {
  return azimuthRadians * (180 / Math.PI) + 180;
}

function normalizeDegrees(degrees: number): number {
  return Math.round(((degrees % 360) + 360) % 360);
}

function normalizeTagLabel(tag: string): string {
  return tag
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function evaluateDiscoveryRegion(
  region: DiscoveryRegion,
  candidates: SunsetLocationCandidate[],
): DiscoveryEvaluation {
  const rankedCandidates = candidates
    .filter((candidate) => candidate.region === region)
    .map(rankSunsetLocation)
    .sort((a, b) => b.totalScore - a.totalScore);

  const sourceProfiles = getSourceProfiles(rankedCandidates);

  return {
    region,
    rankedCandidates,
    sourceProfiles,
  };
}

function scoreScenicValue(candidate: SunsetLocationCandidate): number {
  let score = 0;

  if (candidate.scenicTags.includes("tourism=viewpoint")) {
    score += VIEWPOINT_TAG_BONUS;
  }

  if (candidate.kind === "beach" || candidate.scenicTags.includes("beach")) {
    score += BEACH_TAG_BONUS;
  }

  if (candidate.kind === "park" || candidate.kind === "elevated-park") {
    score += PARK_TAG_BONUS;
  }

  if (candidate.kind === "lighthouse") {
    score += LIGHTHOUSE_TAG_BONUS;
  }

  if (candidate.kind === "trail") {
    score += TRAIL_TAG_BONUS;
  }

  if (hasScenicName(candidate.name)) {
    score += NAMED_SCENIC_BONUS;
  }

  if (candidate.hasWaterView) {
    score += WATER_VIEW_BONUS;
  }

  if (candidate.hasElevation) {
    score += ELEVATION_BONUS;
  }

  return Math.min(score, SCORE_MAX);
}

function hasScenicName(name: string): boolean {
  return /\b(view|lookout|point|shore|dyke|dike|beach|pier|lake|inlet|river|mountain|ridge|marine|waterfront)\b/i.test(
    name,
  );
}

function scoreWestwardView(candidate: SunsetLocationCandidate): number {
  const directionHint = candidate.directionHint?.toUpperCase() ?? "";

  if (directionHint.includes("W")) {
    return WESTWARD_DIRECTION_BONUS + IMPLIED_WESTERN_WATER_BONUS;
  }

  if (directionHint.includes("PANORAMA") || directionHint.includes("360")) {
    return PANORAMA_DIRECTION_BONUS + IMPLIED_WESTERN_WATER_BONUS;
  }

  return candidate.hasWaterView ? IMPLIED_WESTERN_WATER_BONUS : 0;
}

function scoreReferences(candidate: SunsetLocationCandidate): number {
  const textReferenceScore = candidate.references.reduce((score, reference) => {
    if (reference.strength === "strong") {
      return score + STRONG_REFERENCE_SCORE;
    }

    if (reference.strength === "medium") {
      return score + MEDIUM_REFERENCE_SCORE;
    }

    return score + WEAK_REFERENCE_SCORE;
  }, 0);

  return Math.min(
    textReferenceScore + candidate.photoReferenceCount * PHOTO_REFERENCE_SCORE,
    SCORE_MAX,
  );
}

function scoreViewQuality(
  candidate: SunsetLocationCandidate,
  scenicScore: number,
  westwardViewScore: number,
): number {
  let score = Math.round(scenicScore * 0.35 + westwardViewScore * 0.25);

  if (candidate.hasElevation) {
    score += 22;
  }

  if (candidate.hasWaterView) {
    score += 18;
  }

  if (hasOpenHorizonSignal(candidate)) {
    score += 18;
  }

  if (hasForegroundSignal(candidate)) {
    score += 12;
  }

  if (candidate.popularity) {
    // Human-curated popularity (Google reviews) is a strong "confirmed good"
    // signal — boost so well-known spots outrank generic tagged POIs.
    score += Math.round(popularityScore(candidate) * 0.4);
  }

  return Math.min(score, SCORE_MAX);
}

/** Popularity (0-100) from Google rating × review-count confidence. */
function popularityScore(candidate: SunsetLocationCandidate): number {
  const popularity = candidate.popularity;
  if (!popularity) {
    return 0;
  }
  // Rating 3★→0, 5★→1, weighted by review-count confidence (log, saturates ~2000).
  const ratingFactor = Math.max(0, (popularity.rating - 3) / 2);
  const confidence = Math.min(
    1,
    Math.log10(popularity.count + 1) / Math.log10(2000),
  );
  return Math.round(ratingFactor * confidence * SCORE_MAX);
}

function getQualificationBadges(
  candidate: SunsetLocationCandidate,
  viewQualityScore: number,
  referenceScore: number,
): string[] {
  const badges: string[] = [];

  if (popularityScore(candidate) >= 45) {
    badges.push(BADGE_POPULAR);
  }

  if (candidate.hasElevation || candidate.kind === "elevated-park") {
    badges.push(BADGE_HIGH_VANTAGE);
  }

  if (scoreWestwardView(candidate) >= IMPLIED_WESTERN_WATER_BONUS) {
    badges.push(BADGE_WESTERN_EXPOSURE);
  }

  if (hasOpenHorizonSignal(candidate)) {
    badges.push(BADGE_WIDE_HORIZON);
  }

  if (candidate.hasWaterView) {
    badges.push(BADGE_WATER_REFLECTION);
  }

  if (hasForegroundSignal(candidate)) {
    badges.push(BADGE_FOREGROUND_INTEREST);
  }

  if (viewQualityScore >= 60 && referenceScore < MEDIUM_REFERENCE_SCORE) {
    badges.push(BADGE_SEASONAL_SCOUT);
  }

  if (referenceScore >= MEDIUM_REFERENCE_SCORE) {
    badges.push(BADGE_VALIDATED_REFERENCE);
  }

  return badges.slice(0, 5);
}

function hasOpenHorizonSignal(candidate: SunsetLocationCandidate): boolean {
  const joinedSignals = `${candidate.name} ${candidate.kind} ${candidate.scenicTags.join(" ")}`;

  return /\b(beach|bay|inlet|lake|river|waterfront|pier|marina|dyke|dike|point|ridge|mountain|view|lookout|peak|cliff)\b/i.test(
    joinedSignals,
  );
}

function hasForegroundSignal(candidate: SunsetLocationCandidate): boolean {
  const joinedSignals = `${candidate.name} ${candidate.kind} ${candidate.scenicTags.join(" ")}`;

  return /\b(bridge|skyline|mountain|ridge|harbour|harbor|marina|boats?|pier|lighthouse|forest|trees?|water|lake|river|inlet|bay)\b/i.test(
    joinedSignals,
  );
}

function getSourceProfiles(
  candidates: RankedSunsetLocation[],
): SourceEfficiencyProfile[] {
  const sources = Array.from(
    new Set(candidates.flatMap((candidate) => candidate.sources)),
  );

  return sources.map((source) => {
    const sourceCandidates = candidates.filter((candidate) =>
      candidate.sources.includes(source),
    );
    const confirmedCandidateCount = sourceCandidates.filter(
      (candidate) => candidate.confirmedByGoldenSource,
    ).length;
    const confidenceScores = sourceCandidates.map(
      (candidate) => candidate.totalScore,
    );

    return {
      source,
      candidateCount: sourceCandidates.length,
      confirmedCandidateCount,
      estimatedRequestCount:
        SOURCE_REQUEST_BASELINE +
        sourceCandidates.length * sourceRequestEstimate[source],
      requiresApiKey: sourceRequiresApiKey[source],
      canCacheCandidateData: source !== "google-places",
      canCacheImages: sourceCanCacheImages[source],
      medianConfidence: getMedian(confidenceScores),
      notes: getSourceNotes(source),
    };
  });
}

function getMedian(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sortedValues = [...values].sort((a, b) => a - b);
  const middleIndex = Math.floor(sortedValues.length / 2);

  return sortedValues[middleIndex] ?? 0;
}

function getSourceNotes(source: DiscoverySource): string {
  if (source === "osm-overpass") {
    return "Best first-pass source for low-cost scenic candidates.";
  }

  if (source === "google-places") {
    return "Best enrichment source, but paid and photo caching is restricted.";
  }

  if (source === "open-photo") {
    return "Best durable image path when licenses and attribution are stored.";
  }

  return "Useful for golden checks and validation, not scalable as a live source.";
}
