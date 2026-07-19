import { type NextRequest } from "next/server";
import { discoverSunsetLocations } from "~/lib/locationDiscovery";
import type { RankedSunsetLocation } from "~/lib/locationDiscovery/types";
import { getSunsetPrediction } from "~/lib/sunset/api";
import { geocodePlace } from "~/lib/mcp/geocode";
import { renderSunsetGuide } from "~/lib/mcp/knowledge";

/**
 * Minimal Model Context Protocol server (JSON-RPC over HTTP) exposing the
 * Nightfalls sunset toolset, so an assistant (e.g. Miko) can answer user-story
 * questions like "where can I catch an amazing sunset tonight near <place>?".
 *
 * Hand-rolled rather than using @modelcontextprotocol/sdk because that SDK
 * bundles Zod v4, which conflicts with the app's Zod v3 + @t3-oss/env. The
 * protocol surface we need (initialize · tools/list · tools/call · ping) is
 * small and dependency-free.
 */

const PROTOCOL_VERSION = "2024-11-05";
const SPOT_SEARCH_RADIUS_METERS = 25_000;
const SPOT_RESULT_LIMIT = 6;

const PHASE_LABELS: Record<RankedSunsetLocation["bestPhase"], string> = {
  goldenHour: "golden hour",
  sunDisk: "the sun disk",
  beltOfVenus: "the Belt of Venus",
  civilTwilight: "civil twilight",
  blueHour: "blue hour",
};

const TOOLS = [
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
  },
];

function verdict(score: number): string {
  if (score >= 80) return "exceptional";
  if (score >= 65) return "great";
  if (score >= 50) return "good";
  if (score >= 35) return "fair";
  return "poor";
}

function dayLabel(index: number, sunsetTime: string): string {
  if (index === 0) return "Tonight";
  if (index === 1) return "Tomorrow";
  return sunsetTime.split("T")[0] ?? `Day ${index + 1}`;
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

  const lines: string[] = [
    `Near ${geo.name}${geo.admin1 ? `, ${geo.admin1}` : ""}:`,
  ];
  const tonight = prediction?.[0];
  if (tonight) {
    lines.push(
      `Tonight's sky quality: ${Math.round(tonight.score)}/100 (${verdict(
        tonight.score,
      )}).`,
    );
  }
  if (discovery.candidates.length === 0) {
    lines.push("No standout viewing spots found nearby.");
  } else {
    lines.push("", "Best spots to watch from:");
    discovery.candidates.slice(0, SPOT_RESULT_LIMIT).forEach((spot, i) => {
      const popular = spot.qualificationBadges.includes("Popular")
        ? " [Popular]"
        : "";
      const rating = spot.popularity
        ? ` — ${spot.popularity.rating}★ (${spot.popularity.count} reviews)`
        : "";
      lines.push(
        `${i + 1}. ${spot.name}${popular} — best for ${
          PHASE_LABELS[spot.bestPhase]
        }${rating}`,
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

  const lines: string[] = [`Sunset-quality forecast near ${geo.name}:`];
  predictions.forEach((prediction, index) => {
    lines.push(
      `• ${dayLabel(index, prediction.sunset_time)}: ${Math.round(
        prediction.score,
      )}/100 (${verdict(prediction.score)})`,
    );
  });
  const bestIndex = predictions.reduce(
    (best, prediction, index, all) =>
      prediction.score > all[best]!.score ? index : best,
    0,
  );
  lines.push(
    "",
    `Best upcoming evening: ${dayLabel(
      bestIndex,
      predictions[bestIndex]!.sunset_time,
    )} at ${Math.round(predictions[bestIndex]!.score)}/100.`,
  );
  return lines.join("\n");
}

async function callTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case "find_sunset_spots":
      return findSunsetSpots(String(args.location ?? ""));
    case "sunset_forecast":
      return sunsetForecast(String(args.location ?? ""));
    case "sunset_guide":
      return renderSunsetGuide(
        typeof args.topic === "string" ? args.topic : undefined,
      );
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

interface JsonRpcMessage {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

function rpcResult(id: JsonRpcMessage["id"], result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}
function rpcError(id: JsonRpcMessage["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

async function handleMessage(
  message: JsonRpcMessage,
): Promise<object | null> {
  const { id, method, params } = message;
  const isNotification = id === undefined || id === null;

  // Notifications (e.g. notifications/initialized) get acknowledged, no reply.
  if (isNotification) {
    return null;
  }

  try {
    switch (method) {
      case "initialize":
        return rpcResult(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: "nightfalls-sunset", version: "1.0.0" },
        });
      case "ping":
        return rpcResult(id, {});
      case "tools/list":
        return rpcResult(id, { tools: TOOLS });
      case "tools/call": {
        const name = String(params?.name ?? "");
        const args = (params?.arguments as Record<string, unknown>) ?? {};
        const text = await callTool(name, args);
        return rpcResult(id, { content: [{ type: "text", text }] });
      }
      default:
        return rpcError(id, -32601, `Method not found: ${method ?? ""}`);
    }
  } catch (error) {
    return rpcError(
      id,
      -32603,
      error instanceof Error ? error.message : "Internal error",
    );
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(rpcError(null, -32700, "Parse error"), {
      status: 400,
    });
  }

  const messages = Array.isArray(body)
    ? (body as JsonRpcMessage[])
    : [body as JsonRpcMessage];
  const responses = (await Promise.all(messages.map(handleMessage))).filter(
    (response): response is object => response !== null,
  );

  if (responses.length === 0) {
    return new Response(null, { status: 202 });
  }
  return Response.json(Array.isArray(body) ? responses : responses[0]);
}

export function GET() {
  return new Response("Nightfalls MCP server — send JSON-RPC via POST.", {
    status: 405,
    headers: { Allow: "POST" },
  });
}
