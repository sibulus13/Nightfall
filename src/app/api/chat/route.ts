import { type NextRequest } from "next/server";
import { MCP_TOOLS, callTool, type ToolDefinition } from "~/lib/mcp/tools";
import { routeFallbackIntent } from "~/lib/mcp/intent";
import { getClientIp, rateLimit } from "~/lib/rateLimit";

/**
 * Miko chat backend. Runs Gemini with function-calling over the shared
 * Nightfalls tool registry (the same tools the public MCP endpoint exposes),
 * so the assistant can answer "where can I catch a sunset tonight?", weekly
 * forecasts, and FAQ-style questions. Degrades to a keyword intent-router when
 * GEMINI_API_KEY is absent, so the widget is still usable without the LLM.
 */

const GEMINI_MODEL = "gemini-2.5-flash-lite";
const MAX_TOOL_ITERATIONS = 4;
const MAX_MESSAGES = 20;
const MAX_REQUESTS_PER_MINUTE = 15;

const SYSTEM_PROMPT = [
  "You are Miko, the friendly sunset-planning assistant for Nightfalls (nightfalls.ca).",
  "You help people find great sunsets, plan around the weather, and understand sunset phenomena.",
  "Use the provided tools whenever a question is about a specific place, tonight, an upcoming",
  "forecast, or a sunset concept — don't guess forecast numbers or invent spots.",
  "When a user asks about a location, pass the place name to the tool exactly as they said it.",
  "Keep replies warm, concise, and skimmable. Prefer short paragraphs or tight bullet lists.",
  "If you don't have a place to work with, ask for one. Never fabricate scores or spot names.",
].join(" ");

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}
interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

/** MCP JSON Schema → Gemini function-declaration schema (uppercase types). */
function toGeminiSchema(tool: ToolDefinition) {
  const properties: Record<string, { type: string; description?: string }> = {};
  for (const [key, value] of Object.entries(tool.inputSchema.properties)) {
    properties[key] = {
      type: value.type.toUpperCase(),
      description: value.description,
    };
  }
  return {
    type: "OBJECT",
    properties,
    required: tool.inputSchema.required ?? [],
  };
}

async function runGemini(
  apiKey: string,
  history: ChatMessage[],
): Promise<{ reply: string; toolsUsed: string[] }> {
  const contents: GeminiContent[] = history.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  const toolsUsed: string[] = [];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          tools: [
            { functionDeclarations: MCP_TOOLS.map(toGeminiSchema).map((schema, i) => ({
              name: MCP_TOOLS[i]!.name,
              description: MCP_TOOLS[i]!.description,
              parameters: schema,
            })) },
          ],
          generationConfig: { temperature: 0.4 },
          contents,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini request failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
    };
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const functionCalls = parts.filter((part) => part.functionCall);

    if (functionCalls.length === 0) {
      const reply = parts
        .map((part) => part.text ?? "")
        .join("")
        .trim();
      return {
        reply: reply || "I'm not sure how to help with that yet.",
        toolsUsed,
      };
    }

    // Echo the model's tool-call turn, then answer each call.
    contents.push({ role: "model", parts: functionCalls });
    const responseParts: GeminiPart[] = [];
    for (const part of functionCalls) {
      const call = part.functionCall!;
      toolsUsed.push(call.name);
      let result: string;
      try {
        result = await callTool(call.name, call.args ?? {});
      } catch (error) {
        result =
          error instanceof Error ? `Tool error: ${error.message}` : "Tool error.";
      }
      responseParts.push({
        functionResponse: { name: call.name, response: { result } },
      });
    }
    contents.push({ role: "user", parts: responseParts });
  }

  return {
    reply:
      "I gathered the data but couldn't wrap it up — try asking a bit more specifically.",
    toolsUsed,
  };
}

/** Best-effort tool routing when no LLM key is available. */
async function runFallback(
  history: ChatMessage[],
): Promise<{ reply: string; toolsUsed: string[] }> {
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const route = routeFallbackIntent(lastUser?.content ?? "");

  switch (route.kind) {
    case "guide":
      return {
        reply: await callTool("sunset_guide", { topic: route.topic }),
        toolsUsed: ["sunset_guide"],
      };
    case "forecast":
      return {
        reply: await callTool("sunset_forecast", { location: route.location }),
        toolsUsed: ["sunset_forecast"],
      };
    case "spots":
      return {
        reply: await callTool("find_sunset_spots", { location: route.location }),
        toolsUsed: ["find_sunset_spots"],
      };
    case "need_location":
      return {
        reply:
          "Tell me a place — e.g. \"where can I catch a sunset tonight in Seattle?\" or \"best sunset this week near Vancouver?\" — and I'll pull it up.",
        toolsUsed: [],
      };
  }
}

export async function POST(request: NextRequest) {
  const rate = rateLimit(`chat:${getClientIp(request)}`, MAX_REQUESTS_PER_MINUTE);
  if (!rate.ok) {
    return Response.json(
      { error: "Too many messages. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawMessages = (body as { messages?: unknown }).messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return Response.json(
      { error: "messages array is required." },
      { status: 400 },
    );
  }

  const history: ChatMessage[] = rawMessages
    .filter(
      (m): m is ChatMessage =>
        typeof m === "object" &&
        m !== null &&
        (( m as ChatMessage).role === "user" ||
          (m as ChatMessage).role === "assistant") &&
        typeof (m as ChatMessage).content === "string",
    )
    .slice(-MAX_MESSAGES);

  if (history.length === 0) {
    return Response.json(
      { error: "No valid messages provided." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  try {
    const result = apiKey
      ? await runGemini(apiKey, history)
      : await runFallback(history);
    return Response.json(result);
  } catch {
    // LLM failed at runtime — fall back to deterministic tool routing.
    const result = await runFallback(history);
    return Response.json({ ...result, degraded: true });
  }
}
