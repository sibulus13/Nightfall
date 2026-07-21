/**
 * Deterministic intent routing for Miko's keyless fallback (when GEMINI_API_KEY
 * is absent). Pure, network-free, and unit-tested — it maps a user message to
 * one of the shared tools so the widget stays useful without the LLM.
 */

export type FallbackRoute =
  | { kind: "guide"; topic: string }
  | { kind: "forecast"; location: string }
  | { kind: "spots"; location: string }
  | { kind: "need_location" };

const GUIDE_PATTERN =
  /belt of venus|phase|golden hour|blue hour|civil twilight|what makes|how do(es)? (you|nightfalls|it)|explain|why (is|are)/;
const FORECAST_PATTERN = /week|forecast|best day|upcoming|next|which (day|night)/;

export function routeFallbackIntent(message: string): FallbackRoute {
  const text = message.toLowerCase();

  if (GUIDE_PATTERN.test(text)) {
    return { kind: "guide", topic: message };
  }

  const location = extractLocation(message);
  if (!location) {
    return { kind: "need_location" };
  }

  return FORECAST_PATTERN.test(text)
    ? { kind: "forecast", location }
    : { kind: "spots", location };
}

/** Pull a place name out of "…in/near/at/around/for <place>…". */
export function extractLocation(message: string): string | null {
  const match =
    /\b(?:in|near|at|around|for)\s+([A-Za-z][A-Za-z .'-]*[A-Za-z])\b/.exec(
      message,
    );
  if (!match?.[1]) {
    return null;
  }
  // Trim trailing time words the regex may have swept up ("in Seattle tonight").
  return match[1]
    .replace(/\s+(tonight|today|tomorrow|this week|right now)$/i, "")
    .trim();
}
