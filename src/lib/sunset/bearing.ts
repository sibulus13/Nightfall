const COMPASS_POINTS = [
  "N", "NNE", "NE", "ENE",
  "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW",
  "W", "WNW", "NW", "NNW",
] as const;

/**
 * Compass label for a bearing in degrees, e.g. 126 -> "SE (126°)".
 * 16-point rose; used wherever we tell a viewer which way to look.
 */
export function bearingToCompass(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % COMPASS_POINTS.length;
  return `${COMPASS_POINTS[index]} (${Math.round(normalized)}°)`;
}
