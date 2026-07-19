/**
 * Lightweight per-key sliding-window rate limiter.
 *
 * IMPORTANT — this is in-memory, so it is effective on a SINGLE long-running
 * instance (local dev, a single Node server) but NOT across serverless
 * instances (each Vercel invocation may get a fresh module). For production
 * abuse/cost protection it must be backed by a shared store (Upstash Redis /
 * Vercel KV via `@upstash/ratelimit`) AND paired with Google Cloud API key
 * restrictions + daily quota caps (the definitive guard for the paid APIs).
 * This provides baseline defense-in-depth and a drop-in shape for that upgrade.
 */

const DEFAULT_WINDOW_MS = 60_000;
const buckets = new Map<string, number[]>();

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number = DEFAULT_WINDOW_MS,
): RateLimitResult {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= maxRequests) {
    const oldest = recent[0] ?? now;
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
    };
  }

  recent.push(now);
  buckets.set(key, recent);
  return { ok: true, retryAfterSeconds: 0 };
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}
