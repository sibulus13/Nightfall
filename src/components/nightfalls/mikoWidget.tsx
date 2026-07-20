"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Sparkles, Send, X, Sunset } from "lucide-react";

/**
 * Miko — the floating sunset assistant. Talks to /api/chat, which runs Gemini
 * with function-calling over the Nightfalls tool registry (and degrades to
 * keyword tool-routing without a key). Miko's identity colour is the sunset
 * phase gradient (golden → orange → pink), matching lib/sunset/phaseColors.
 */

// Warm → cool sky, the shared Nightfalls sunset signature.
const MIKO_GRADIENT =
  "linear-gradient(135deg, rgb(251,191,36) 0%, rgb(249,115,22) 52%, rgb(244,114,182) 100%)";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
}

const SUGGESTED_PROMPTS = [
  "Where can I catch a sunset tonight in Seattle?",
  "Best sunset this week near Vancouver?",
  "What is the Belt of Venus?",
];

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi, I'm Miko 🌅 Ask me where to catch a great sunset tonight, what's coming up this week, or anything about how sunsets work.",
};

const TOOL_LABELS: Record<string, string> = {
  find_sunset_spots: "Found spots",
  sunset_forecast: "Checked the forecast",
  sunset_guide: "Sunset guide",
};

export default function MikoWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });

      if (!response.ok) {
        const retry =
          response.status === 429
            ? "I'm getting a lot of questions right now — give me a moment and try again."
            : "Something went wrong on my end. Please try again.";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: retry },
        ]);
        return;
      }

      const data = (await response.json()) as {
        reply: string;
        toolsUsed?: string[];
      };
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          toolsUsed: data.toolsUsed,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I couldn't reach the network. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Miko, the sunset assistant"
          className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 motion-reduce:transition-none"
          style={{ background: MIKO_GRADIENT }}
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Chat with Miko"
          className="fixed inset-x-3 bottom-3 z-[60] flex max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl sm:inset-x-auto sm:right-5 sm:bottom-5 sm:h-[560px] sm:w-[380px]"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 text-white"
            style={{ background: MIKO_GRADIENT }}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Sunset className="h-5 w-5" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold">Miko</p>
                <p className="text-xs text-white/80">Sunset assistant</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-full p-1 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {messages.map((message, index) => (
              <MessageBubble key={index} message={message} />
            ))}
            {loading && <TypingIndicator />}

            {messages.length <= 1 && !loading && (
              <div className="space-y-2 pt-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void send(prompt)}
                    className="block w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-orange-300 hover:bg-muted"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send(input);
                  }
                }}
                rows={1}
                placeholder="Ask about a sunset…"
                className="max-h-28 flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <button
                type="button"
                onClick={() => void send(input)}
                disabled={!input.trim() || loading}
                aria-label="Send message"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white transition-opacity disabled:opacity-40"
                style={{ background: MIKO_GRADIENT }}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">
              Miko can use live Nightfalls forecasts. Double-check plans before
              you head out.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div className="max-w-[85%]">
        <div
          className={
            isUser
              ? "whitespace-pre-wrap rounded-2xl rounded-br-sm px-3 py-2 text-sm text-white"
              : "rounded-2xl rounded-bl-sm border border-border bg-muted/50 px-3 py-2 text-sm text-foreground"
          }
          style={isUser ? { background: MIKO_GRADIENT } : undefined}
        >
          {isUser ? message.content : <MarkdownMessage text={message.content} />}
        </div>
        {message.toolsUsed && message.toolsUsed.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1 px-1">
            {Array.from(new Set(message.toolsUsed)).map((tool) => (
              <span
                key={tool}
                className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-300"
              >
                {TOOL_LABELS[tool] ?? tool}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Minimal Markdown renderer for Miko's replies — links, **bold**, _muted_, and
// `- ` lines as tappable cards. Dependency-free and safe (no dangerouslySetHTML);
// the input format is the tool output we control.
const INLINE_TOKEN = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|_([^_]+)_/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = new RegExp(INLINE_TOKEN);
  let lastIndex = 0;
  let token = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const key = `${keyPrefix}-${token}`;
    if (match[1] !== undefined && match[2] !== undefined) {
      nodes.push(
        <a
          key={key}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-orange-600 underline decoration-orange-300 underline-offset-2 hover:text-orange-500 dark:text-orange-300"
        >
          {renderInline(match[1], key)}
        </a>,
      );
    } else if (match[3] !== undefined) {
      nodes.push(<strong key={key}>{match[3]}</strong>);
    } else if (match[4] !== undefined) {
      nodes.push(
        <span key={key} className="text-muted-foreground">
          {match[4]}
        </span>,
      );
    }
    lastIndex = regex.lastIndex;
    token += 1;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

function MarkdownMessage({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length === 0) return;
    const items = listItems;
    listItems = [];
    blocks.push(
      <div key={key} className="space-y-1.5">
        {items.map((item, index) => (
          <div
            key={index}
            className="rounded-lg border border-border bg-background/60 px-3 py-2 leading-snug"
          >
            {renderInline(item, `${key}-${index}`)}
          </div>
        ))}
      </div>,
    );
  };

  lines.forEach((line, index) => {
    if (line.startsWith("- ")) {
      listItems.push(line.slice(2));
      return;
    }
    flushList(`list-${index}`);
    if (line.trim() !== "") {
      blocks.push(
        <p key={`p-${index}`} className="leading-snug">
          {renderInline(line, `p-${index}`)}
        </p>,
      );
    }
  });
  flushList("list-end");

  return <div className="space-y-2">{blocks}</div>;
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex gap-1 rounded-2xl rounded-bl-sm border border-border bg-muted/50 px-3 py-3">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 motion-reduce:animate-none"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
