import { type NextRequest } from "next/server";

const TILE_CACHE_MAX_AGE_SECONDS = 1800;

interface CloudTileParams {
  params: {
    z: string;
    x: string;
    y: string;
  };
}

/**
 * Server-side proxy for OpenWeatherMap Weather Maps 2.0 cloud tiles.
 * Keeps `OPENWEATHER_API_KEY` out of the browser bundle and degrades
 * gracefully (204 / transparent) when the key is missing or OWM fails,
 * so the map keeps working without a key.
 */
export async function GET(
  request: NextRequest,
  { params }: CloudTileParams,
): Promise<Response> {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  // Graceful degradation: no key -> no tiles, but the map still renders.
  if (!apiKey) {
    return new Response(null, { status: 204 });
  }

  const { z, x, y } = params;
  const date = request.nextUrl.searchParams.get("date");

  const upstreamParams = new URLSearchParams({
    appid: apiKey,
    opacity: "0.6",
    fill_bound: "true",
  });
  if (date) {
    upstreamParams.set("date", date);
  }

  const upstreamUrl = `https://maps.openweathermap.org/maps/2.0/weather/CL/${z}/${x}/${y}?${upstreamParams.toString()}`;

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      // Cache upstream tiles at the fetch layer too.
      next: { revalidate: TILE_CACHE_MAX_AGE_SECONDS },
    });
  } catch {
    // Network failure -> transparent (no tile), never throw.
    return new Response(null, { status: 204 });
  }

  if (!upstreamResponse.ok || !upstreamResponse.body) {
    return new Response(null, { status: 204 });
  }

  return new Response(upstreamResponse.body, {
    status: 200,
    headers: {
      "Content-Type": upstreamResponse.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": `public, max-age=${TILE_CACHE_MAX_AGE_SECONDS}`,
    },
  });
}
