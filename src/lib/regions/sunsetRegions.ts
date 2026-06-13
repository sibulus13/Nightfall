import { goldenCheckCandidates } from "~/lib/locationDiscovery/fixtures";
import { rankSunsetLocation } from "~/lib/locationDiscovery/ranking";
import type { RankedSunsetLocation } from "~/lib/locationDiscovery/types";

export interface SunsetRegion {
  slug: string;
  name: string;
  areaLabel: string;
  province: string;
  country: string;
  latitude: number;
  longitude: number;
  intro: string;
  bestFor: string[];
  scoutingNotes: string[];
  nearbySlugs: string[];
}

export interface RankedSunsetRegion extends SunsetRegion {
  spots: RankedSunsetLocation[];
  topPhases: string[];
  topSceneQualities: string[];
}

export const sunsetRegions: SunsetRegion[] = [
  {
    slug: "vancouver-bc",
    name: "Vancouver",
    areaLabel: "Vancouver, BC",
    province: "British Columbia",
    country: "Canada",
    latitude: 49.2827,
    longitude: -123.1207,
    intro:
      "Vancouver is strongest for water-facing golden hour, beach sunsets, skyline foregrounds, and elevated viewpoints that stay useful into blue hour.",
    bestFor: ["Golden hour", "Sun disk", "Blue hour", "Water reflection"],
    scoutingNotes: [
      "Prioritize west-facing beaches when the horizon is clear.",
      "Use elevated parks when clouds are layered and the city needs separation.",
      "Stay after sunset for blue hour reflections around downtown and the inlet.",
    ],
    nearbySlugs: ["surrey-bc", "coquitlam-bc"],
  },
  {
    slug: "surrey-bc",
    name: "Surrey",
    areaLabel: "Surrey, BC",
    province: "British Columbia",
    country: "Canada",
    latitude: 49.1913,
    longitude: -122.849,
    intro:
      "Surrey is best for quieter waterfront scouting, open marsh horizons, Crescent Beach color, and low foregrounds that work well during civil twilight.",
    bestFor: ["Civil twilight", "Blue hour", "Water reflection", "Open horizon"],
    scoutingNotes: [
      "Mud Bay and Crescent Beach are the safest first checks for open western light.",
      "Wetland and dyke routes are useful when cloud texture matters more than a clean sun disk.",
      "Expect longer walking approaches than central Vancouver beach locations.",
    ],
    nearbySlugs: ["vancouver-bc", "coquitlam-bc"],
  },
  {
    slug: "coquitlam-bc",
    name: "Coquitlam and Port Moody",
    areaLabel: "Coquitlam, BC",
    province: "British Columbia",
    country: "Canada",
    latitude: 49.2838,
    longitude: -122.7932,
    intro:
      "Coquitlam and Port Moody are strongest for inlet reflections, mountain silhouettes, and elevated park views that can outperform beaches during Belt of Venus and blue hour.",
    bestFor: ["Belt of Venus", "Blue hour", "High vantage", "Inlet reflection"],
    scoutingNotes: [
      "Use inlet parks when water reflections and mountain silhouettes matter.",
      "Use Burnaby Mountain-style viewpoints when the western sky is broken or layered.",
      "This region benefits from phase-aware scouting because the best view may be away from the sun.",
    ],
    nearbySlugs: ["vancouver-bc", "surrey-bc"],
  },
];

export function getRankedSunsetRegions(): RankedSunsetRegion[] {
  return sunsetRegions.map((region) => {
    const spots = goldenCheckCandidates
      .filter((candidate) => candidate.region === region.slug)
      .map(rankSunsetLocation)
      .sort((a, b) => b.totalScore - a.totalScore);

    return {
      ...region,
      spots,
      topPhases: getTopValues(spots.flatMap((spot) => spot.recommendedFor), 5),
      topSceneQualities: getTopValues(
        spots.flatMap((spot) => spot.qualificationBadges),
        6,
      ),
    };
  });
}

export function getRankedSunsetRegion(
  slug: string,
): RankedSunsetRegion | null {
  return getRankedSunsetRegions().find((region) => region.slug === slug) ?? null;
}

function getTopValues(values: string[], limit: number): string[] {
  const counts = new Map<string, number>();

  values.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value]) => value);
}
