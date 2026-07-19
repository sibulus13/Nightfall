import { type Metadata } from "next";
import { MCP_TOOLS } from "~/lib/mcp/tools";

export const metadata: Metadata = {
  title: "Developers — Nightfalls MCP | Sunset tools for your AI assistant",
  description:
    "Connect the Nightfalls sunset toolset to any Model Context Protocol (MCP) client. Find sunset spots, multi-day forecasts, and sunset education over a single JSON-RPC endpoint.",
  alternates: { canonical: "/developers" },
};

const MCP_URL = "https://www.nightfalls.ca/api/mcp";

// Warm → cool sky, the shared Nightfalls sunset signature.
const SUNSET_GRADIENT =
  "linear-gradient(135deg, rgb(251,191,36) 0%, rgb(249,115,22) 52%, rgb(244,114,182) 100%)";

const CLIENT_CONFIG = `{
  "mcpServers": {
    "nightfalls": {
      "type": "http",
      "url": "${MCP_URL}"
    }
  }
}`;

const CURL_EXAMPLE = `curl -s -X POST ${MCP_URL} \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "find_sunset_spots",
      "arguments": { "location": "Seattle" }
    }
  }'`;

export default function DevelopersPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-14">
      {/* Hero */}
      <header className="mb-12">
        <span
          className="inline-block rounded-full bg-clip-text text-xs font-semibold uppercase tracking-widest text-transparent"
          style={{ backgroundImage: SUNSET_GRADIENT }}
        >
          Nightfalls MCP
        </span>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Put sunset intelligence
          <br />
          in your AI assistant.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Nightfalls exposes its sunset toolset over the{" "}
          <a
            href="https://modelcontextprotocol.io"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline decoration-orange-400 underline-offset-2"
          >
            Model Context Protocol
          </a>
          . Point any MCP client at one endpoint and it can find great sunset
          spots, pull multi-day forecasts, and explain how sunsets work — with
          live data, no API key required.
        </p>
      </header>

      {/* Endpoint */}
      <section className="mb-12">
        <SectionLabel>Endpoint</SectionLabel>
        <div
          className="mt-3 rounded-xl p-[1.5px]"
          style={{ background: SUNSET_GRADIENT }}
        >
          <div className="flex flex-col gap-1 rounded-[calc(0.75rem-1.5px)] bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <code className="font-mono text-sm text-foreground">{MCP_URL}</code>
            <span className="text-xs text-muted-foreground">
              JSON-RPC 2.0 · Streamable HTTP · POST
            </span>
          </div>
        </div>
      </section>

      {/* Connect */}
      <section className="mb-12">
        <SectionLabel>Connect your client</SectionLabel>
        <p className="mt-2 text-sm text-muted-foreground">
          Add Nightfalls to any MCP-capable client (Claude, Cursor, or your own
          agent). For example:
        </p>
        <CodeBlock>{CLIENT_CONFIG}</CodeBlock>
      </section>

      {/* Tools */}
      <section className="mb-12">
        <SectionLabel>Tools</SectionLabel>
        <div className="mt-3 space-y-3">
          {MCP_TOOLS.map((tool) => {
            const params = Object.entries(tool.inputSchema.properties);
            const required = new Set(tool.inputSchema.required ?? []);
            return (
              <div
                key={tool.name}
                className="rounded-xl border border-border bg-muted/30 p-4"
              >
                <div className="flex items-baseline gap-2">
                  <code className="font-mono text-sm font-semibold text-foreground">
                    {tool.name}
                  </code>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {tool.description}
                </p>
                {params.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {params.map(([name, schema]) => (
                      <li key={name} className="text-xs text-muted-foreground">
                        <code className="font-mono text-foreground">{name}</code>
                        <span className="text-muted-foreground/70">
                          {" "}
                          {schema.type}
                        </span>
                        {required.has(name) ? (
                          <span className="ml-1 text-orange-500">required</span>
                        ) : (
                          <span className="ml-1 text-muted-foreground/60">
                            optional
                          </span>
                        )}
                        {schema.description ? ` — ${schema.description}` : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Try it */}
      <section className="mb-4">
        <SectionLabel>Try it</SectionLabel>
        <p className="mt-2 text-sm text-muted-foreground">
          Call a tool directly over JSON-RPC — no auth needed:
        </p>
        <CodeBlock>{CURL_EXAMPLE}</CodeBlock>
        <p className="mt-3 text-xs text-muted-foreground">
          Discover the full tool list at runtime with the{" "}
          <code className="font-mono text-foreground">tools/list</code> method.
          Fair-use rate limits apply.
        </p>
      </section>
    </main>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </h2>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-xl border border-border bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100">
      <code className="font-mono">{children}</code>
    </pre>
  );
}
