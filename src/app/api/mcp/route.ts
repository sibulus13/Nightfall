import { type NextRequest } from "next/server";
import { MCP_TOOLS, callTool } from "~/lib/mcp/tools";

/**
 * Minimal Model Context Protocol server (JSON-RPC over HTTP) exposing the
 * Nightfalls sunset toolset, so any MCP client — an assistant like Miko, or a
 * technical user's own client (Claude, Cursor, …) — can answer user-story
 * questions like "where can I catch an amazing sunset tonight near <place>?".
 *
 * Hand-rolled rather than using @modelcontextprotocol/sdk because that SDK
 * bundles Zod v4, which conflicts with the app's Zod v3 + @t3-oss/env. The
 * protocol surface we need (initialize · tools/list · tools/call · ping) is
 * small and dependency-free. Tool definitions live in ~/lib/mcp/tools so the
 * chat backend and this endpoint share one source of truth.
 */

const PROTOCOL_VERSION = "2024-11-05";

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

async function handleMessage(message: JsonRpcMessage): Promise<object | null> {
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
        return rpcResult(id, {
          tools: MCP_TOOLS.map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          })),
        });
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
