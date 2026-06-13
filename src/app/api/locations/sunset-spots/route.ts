import { type NextRequest } from "next/server";
import { discoverSunsetLocations } from "~/lib/locationDiscovery";

const DEFAULT_RADIUS_METERS = 12_000;
const DEFAULT_LIMIT = 12;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const latitude = Number(searchParams.get("lat"));
  const longitude = Number(searchParams.get("lon"));
  const radiusMeters = Number(
    searchParams.get("radiusMeters") ?? DEFAULT_RADIUS_METERS,
  );
  const limit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);

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
  });

  return Response.json(result);
}

function isValidLatitude(latitude: number): boolean {
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90;
}

function isValidLongitude(longitude: number): boolean {
  return Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

