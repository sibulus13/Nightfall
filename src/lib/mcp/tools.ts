import { discoverSunsetLocations } from "~/lib/locationDiscovery";
import type { RankedSunsetLocation } from "~/lib/locationDiscovery/types";
import { getSunsetPrediction } from "~/lib/sunset/api";
import { geocodePlace } from "~/lib/mcp/geocode";
import { renderSunsetGuide } from "~/lib/mcp/knowledge";

/**
 * The Nightfalls tool registry — one typed source of truth for every AI
 * transport. The public MCP server (`/api/mcp`) and the in-app Miko chat
 * backend (`/api/chat`) both consume these definitions, so a developer's MCP
 * client and an end-user's chat run identical logic and can never drift.
 */

export interface ToolJsonSchema {
  type: "object";
  properties: Record<
    string,
    { type: string; description?: string }
  >;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: ToolJsonSchema;
  handler: (args: Record<string, unknown>) => Promise<string>;
}

const SPOT_SEARCH_RADIUS_METERS = 25_000;
const SPOT_RESULT_LIMIT = 6;

const PHASE_LABELS: Record<RankedSunsetLocation["bestPhase"], string> = {
  goldenHour: "golden hour",
  sunDisk: "the sun disk",
  beltOfVenus: "the Belt of Venus",
  civilTwilight: "civil twilight",
  blueHour: "blue hour",
};

const SITE_URL = "https://www.nightfalls.ca";

// Qualitative band leads the answer — a number like "86/100" isn't intuitive on
// its own. An extra top band ("Pristine") separates the clustered high scores a
// plain "exceptional" would flatten together.
function qualityLabel(score: number): string {
  if (score >= 85) return "Pristine";
  if (score >= 70) return "Exceptional";
  if (score >= 55) return "Great";
  if (score >= 40) return "Good";
  if (score >= 25) return "Fair";
  return "Poor";
}

function dayLabel(index: number, sunsetTime: string): string {
  if (index === 0) return "Tonight";
  if (index === 1) return "Tomorrow";
  const datePart = sunsetTime.split("T")[0];
  if (!datePart) {
    return `Day ${index + 1}`;
  }
  // Anchor at midday so the weekday/date can't roll over a timezone boundary.
  return new Date(`${datePart}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Deep link to the planner centered on a location, so each card opens the app
// at exactly that spot/place.
function plannerLink(
  latitude: number,
  longitude: number,
  options?: { predictions?: boolean },
): string {
  const params = new URLSearchParams({
    lat: latitude.toFixed(4),
    lon: longitude.toFixed(4),
  });
  if (options?.predictions) {
    params.set("tab", "predictions");
  }
  return `${SITE_URL}/App?${params.toString()}`;
}

async function findSunsetSpots(location: string): Promise<string> {
  const geo = await geocodePlace(location);
  if (!geo) {
    return `I couldn't find a place called "${location}".`;
  }

  const [prediction, discovery] = await Promise.all([
    getSunsetPrediction(geo.latitude, geo.longitude).catch(() => null),
    discoverSunsetLocations({
      latitude: geo.latitude,
      longitude: geo.longitude,
      radiusMeters: SPOT_SEARCH_RADIUS_METERS,
      limit: SPOT_RESULT_LIMIT,
    }),
  ]);

  const place = `${geo.name}${geo.admin1 ? `, ${geo.admin1}` : ""}`;
  const tonight = prediction?.[0];
  const lines: string[] = [
    tonight
      ? `**Sunset spots near ${geo.name}** · tonight looks **${qualityLabel(
          tonight.score,
        )}** _(${Math.round(tonight.score)}/100)_`
      : `**Sunset spots near ${place}**`,
    "",
  ];

  if (discovery.candidates.length === 0) {
    lines.push("No standout viewing spots found nearby.");
  } else {
    discovery.candidates.slice(0, SPOT_RESULT_LIMIT).forEach((spot) => {
      const popular = spot.qualificationBadges.includes("Popular") ? " 🔥" : "";
      const rating = spot.popularity ? ` · ${spot.popularity.rating}★` : "";
      const link = plannerLink(spot.latitude, spot.longitude);
      lines.push(
        `- [**${spot.name}**${popular} — best for ${
          PHASE_LABELS[spot.bestPhase]
        }${rating}](${link})`,
      );
    });
  }
  return lines.join("\n");
}

async function sunsetForecast(location: string): Promise<string> {
  const geo = await geocodePlace(location);
  if (!geo) {
    return `I couldn't find a place called "${location}".`;
  }
  const predictions = await getSunsetPrediction(
    geo.latitude,
    geo.longitude,
  ).catch(() => null);
  if (!predictions || predictions.length === 0) {
    return `No sunset forecast available for ${geo.name}.`;
  }

  const bestIndex = predictions.reduce(
    (best, prediction, index, all) =>
      prediction.score > all[best]!.score ? index : best,
    0,
  );

  const lines: string[] = [`**Sunset forecast — ${geo.name}**`, ""];
  predictions.forEach((prediction, index) => {
    const best = index === bestIndex ? " · ⭐ best this week" : "";
    const link = plannerLink(geo.latitude, geo.longitude, { predictions: true });
    lines.push(
      `- [**${dayLabel(index, prediction.sunset_time)}** — ${qualityLabel(
        prediction.score,
      )} _(${Math.round(prediction.score)}/100)_${best}](${link})`,
    );
  });
  return lines.join("\n");
}

export const MCP_TOOLS: ToolDefinition[] = [
  {
    name: "find_sunset_spots",
    description:
      "Find the best nearby places to watch tonight's sunset near a location, with tonight's sky-quality forecast. Answers 'where can I catch an amazing sunset tonight near <place>?'.",
    inputSchema: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "City or place name, e.g. 'Seattle' or 'Vancouver, BC'.",
        },
      },
      required: ["location"],
      additionalProperties: false,
    },
    handler: (args) => findSunsetSpots(String(args.location ?? "")),
  },
  {
    name: "sunset_forecast",
    description:
      "Multi-day sunset-quality forecast for a location and which upcoming evening is best. Answers 'what's the best sunset this week near <place>?'.",
    inputSchema: {
      type: "object",
      properties: {
        location: { type: "string", description: "City or place name." },
      },
      required: ["location"],
      additionalProperties: false,
    },
    handler: (args) => sunsetForecast(String(args.location ?? "")),
  },
  {
    name: "sunset_guide",
    description:
      "Explain sunset concepts — the five phases (golden hour, sun disk, Belt of Venus, civil twilight, blue hour), what makes a sunset vivid, and how Nightfalls recommends spots.",
    inputSchema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description:
            "Optional focus, e.g. 'belt of venus' or 'what makes a good sunset'.",
        },
      },
      additionalProperties: false,
    },
    handler: (args) =>
      Promise.resolve(
        renderSunsetGuide(typeof args.topic === "string" ? args.topic : undefined),
      ),
  },
];

/** Dispatch a tool call by name. Throws on an unknown tool. */
export async function callTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const tool = MCP_TOOLS.find((candidate) => candidate.name === name);
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return tool.handler(args);
}
