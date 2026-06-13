const EARTH_RADIUS_KM = 6371;
const KM_TO_METERS = 1000;
const DEGREES_TO_RADIANS = Math.PI / 180;

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export function getDistanceMeters(a: Coordinate, b: Coordinate): number {
  const latDelta = toRadians(b.latitude - a.latitude);
  const lonDelta = toRadians(b.longitude - a.longitude);
  const startLat = toRadians(a.latitude);
  const endLat = toRadians(b.latitude);

  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(lonDelta / 2) ** 2;
  const angularDistance =
    2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return Math.round(EARTH_RADIUS_KM * angularDistance * KM_TO_METERS);
}

function toRadians(degrees: number): number {
  return degrees * DEGREES_TO_RADIANS;
}

