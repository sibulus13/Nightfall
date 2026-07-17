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

/**
 * Forward geodesic: the coordinate reached by travelling `distanceMeters`
 * from `origin` along compass `bearingDegrees` (0 = north, 90 = east).
 * Spherical model — accurate to well under a metre at the <30 km ranges we sample.
 */
export function destinationPoint(
  origin: Coordinate,
  bearingDegrees: number,
  distanceMeters: number,
): Coordinate {
  const angularDistance = distanceMeters / KM_TO_METERS / EARTH_RADIUS_KM;
  const bearing = toRadians(bearingDegrees);
  const lat1 = toRadians(origin.latitude);
  const lon1 = toRadians(origin.longitude);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );

  return {
    latitude: lat2 / DEGREES_TO_RADIANS,
    longitude: lon2 / DEGREES_TO_RADIANS,
  };
}

function toRadians(degrees: number): number {
  return degrees * DEGREES_TO_RADIANS;
}

