import { discoverSunsetLocations } from "~/lib/locationDiscovery";
import type { RankedSunsetLocation } from "~/lib/locationDiscovery";
import type { CityGuide, CityGuideRequest } from "~/types/cityGuide";
import { getCityGuideExpiryDate } from "./cache";

interface GeminiGuidePayload {
  summary?: string;
  bestTimes?: string[];
  scoutingTips?: string[];
}

const CITY_GUIDE_RADIUS_METERS = 18_000;
const CITY_GUIDE_SPOT_LIMIT = 8;
const GEMINI_MODEL = "gemini-2.5-flash-lite";

export async function generateCityGuide(
  request: CityGuideRequest,
): Promise<CityGuide> {
  const discoveredLocations = await discoverSunsetLocations({
    latitude: request.latitude,
    longitude: request.longitude,
    radiusMeters: CITY_GUIDE_RADIUS_METERS,
    limit: CITY_GUIDE_SPOT_LIMIT,
  });
  const recommendedSpots = discoveredLocations.candidates.map(toGuideSpot);
  const fallbackGuide = createFallbackCityGuide(request, recommendedSpots);
  const aiGuide = await generateGeminiCityGuide(request, recommendedSpots);

  if (!aiGuide) {
    return fallbackGuide;
  }

  return {
    ...fallbackGuide,
    source: "gemini",
    summary: aiGuide.summary ?? fallbackGuide.summary,
    bestTimes:
      aiGuide.bestTimes && aiGuide.bestTimes.length > 0
        ? aiGuide.bestTimes.slice(0, 4)
        : fallbackGuide.bestTimes,
    scoutingTips:
      aiGuide.scoutingTips && aiGuide.scoutingTips.length > 0
        ? aiGuide.scoutingTips.slice(0, 5)
        : fallbackGuide.scoutingTips,
  };
}

function createFallbackCityGuide(
  request: CityGuideRequest,
  recommendedSpots: CityGuide["recommendedSpots"],
): CityGuide {
  const generatedAt = new Date();
  const topSpot = recommendedSpots[0];
  const topQualities = Array.from(
    new Set(recommendedSpots.flatMap((spot) => spot.qualificationBadges)),
  ).slice(0, 4);

  return {
    id: [
      request.cityName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      request.latitude.toFixed(2),
      request.longitude.toFixed(2),
    ].join("-"),
    cityName: request.cityName,
    latitude: request.latitude,
    longitude: request.longitude,
    generatedAt: generatedAt.toISOString(),
    expiresAt: getCityGuideExpiryDate().toISOString(),
    source: "fallback",
    cacheStatus: "miss",
    summary:
      topSpot && topQualities.length > 0
        ? `${request.cityName} looks best when you scout around ${topSpot.name} and prioritize ${topQualities.join(", ").toLowerCase()}.`
        : `${request.cityName} can still be scouted by looking for open western horizons, water, public parks, and elevated viewpoints near the selected area.`,
    bestTimes: [
      "Golden hour for warm foreground light",
      "Sunset when the western horizon is open",
      "Civil twilight for pink-purple afterglow",
      "Blue hour for water, skyline, and silhouette scenes",
    ],
    scoutingTips: [
      "Start with water or elevated public viewpoints before narrowing the plan.",
      "Use the planner map to compare up to five saved pins for the same date.",
      "Stay after sunset when layered cloud or water reflections are present.",
      "If the sun-facing view is blocked, check the opposite sky for Belt of Venus color.",
    ],
    recommendedSpots,
  };
}

async function generateGeminiCityGuide(
  request: CityGuideRequest,
  recommendedSpots: CityGuide["recommendedSpots"],
): Promise<GeminiGuidePayload | null> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || recommendedSpots.length === 0) {
    return null;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.45,
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: buildGeminiPrompt(request, recommendedSpots),
                },
              ],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return null;
    }

    return JSON.parse(text) as GeminiGuidePayload;
  } catch {
    return null;
  }
}

function buildGeminiPrompt(
  request: CityGuideRequest,
  recommendedSpots: CityGuide["recommendedSpots"],
): string {
  return [
    "Create a concise sunset photography city guide as JSON only.",
    "Use only these candidate spots; do not invent new locations.",
    "Schema: {\"summary\":\"...\",\"bestTimes\":[\"...\"],\"scoutingTips\":[\"...\"]}",
    `City: ${request.cityName}`,
    `Coordinates: ${request.latitude}, ${request.longitude}`,
    `Candidate spots: ${recommendedSpots
      .map(
        (spot) =>
          `${spot.name} (${spot.kind}; best for ${spot.recommendedFor.join(", ")})`,
      )
      .join("; ")}`,
  ].join("\n");
}

function toGuideSpot(
  spot: RankedSunsetLocation,
): CityGuide["recommendedSpots"][number] {
  return {
    id: spot.id,
    name: spot.name,
    kind: spot.kind,
    latitude: spot.latitude,
    longitude: spot.longitude,
    qualificationBadges: spot.qualificationBadges,
    recommendedFor: spot.recommendedFor,
    bestPhase: spot.bestPhase,
    goldenHour: spot.goldenHour,
    references: spot.references,
    referenceImages: spot.referenceImages,
  };
}
