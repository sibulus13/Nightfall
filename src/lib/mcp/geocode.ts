export interface GeocodeResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

/**
 * Resolve a place name to coordinates via Open-Meteo's geocoding API — free, no
 * key, no referrer restriction (so the MCP tools don't depend on the Google key
 * that's locked to nightfalls.ca). Returns null if nothing matches.
 */
export async function geocodePlace(
  name: string,
): Promise<GeocodeResult | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    name,
  )}&count=1&language=en&format=json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as {
      results?: Array<{
        name: string;
        latitude: number;
        longitude: number;
        country?: string;
        admin1?: string;
      }>;
    };
    const first = data.results?.[0];
    if (!first) {
      return null;
    }
    return {
      name: first.name,
      latitude: first.latitude,
      longitude: first.longitude,
      country: first.country,
      admin1: first.admin1,
    };
  } catch {
    return null;
  }
}
