import { type NextRequest } from "next/server";
import { discoverSunsetLocations } from "~/lib/locationDiscovery";
import { getClientIp, rateLimit } from "~/lib/rateLimit";

const DEFAULT_RADIUS_METERS = 12_000;
const DEFAULT_LIMIT = 12;
const MAX_REQUESTS_PER_MINUTE = 20;

export async function GET(request: NextRequest) {
  // Guard the paid Google Places call behind a per-IP limit (legit clients
  // debounce + cache, so a few/min is plenty). See lib/rateLimit for the
  // serverless caveat + the Google-quota guard that must back this in prod.
  const rate = rateLimit(`spots:${getClientIp(request)}`, MAX_REQUESTS_PER_MINUTE);
  if (!rate.ok) {
    return Response.json(
      { error: "Too many requests. Please slow down." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const latitude = Number(searchParams.get("lat"));
  const longitude = Number(searchParams.get("lon"));
  const radiusMeters = Number(
    searchParams.get("radiusMeters") ?? DEFAULT_RADIUS_METERS,
  );
  const limit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);
  // Progressive loading: `terrain=false` skips the slower terrain enrichment
  // for an instant first paint; the client follows up with the full request.
  const includeTerrain = searchParams.get("terrain") !== "false";

  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return Response.json(
      { error: "Valid lat and lon query parameters are required." },
      { status: 400 },
    );
  }

  const result = await discoverSunsetLocations({
    latitude,
    longitude,
    radiusMeters,
    limit,
    includeTerrain,
  });

  return Response.json(result);
}

function isValidLatitude(latitude: number): boolean {
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90;
}

function isValidLongitude(longitude: number): boolean {
  return Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

