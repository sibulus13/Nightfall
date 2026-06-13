export const LAST_LOCATION_COOKIE_NAME = "nightfalls-last-location";

const LOCATION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;
const COORDINATE_PRECISION = 6;

export function saveBrowserLocationPreference(location: {
  lat: number;
  lng: number;
}): void {
  if (typeof document === "undefined" || !isValidLocation(location)) {
    return;
  }

  const value = [
    location.lat.toFixed(COORDINATE_PRECISION),
    location.lng.toFixed(COORDINATE_PRECISION),
  ].join(",");
  const secureAttribute =
    window.location.protocol === "https:" ? "; Secure" : "";

  document.cookie = `${LAST_LOCATION_COOKIE_NAME}=${encodeURIComponent(
    value,
  )}; Max-Age=${LOCATION_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secureAttribute}`;
}

export function clearBrowserLocationPreference(): void {
  if (typeof document === "undefined") {
    return;
  }

  const secureAttribute =
    window.location.protocol === "https:" ? "; Secure" : "";

  document.cookie = `${LAST_LOCATION_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax${secureAttribute}`;
}

export function readBrowserLocationPreference(): {
  lat: number;
  lng: number;
} | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookieValue = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${LAST_LOCATION_COOKIE_NAME}=`))
    ?.split("=")[1];

  if (!cookieValue) {
    return null;
  }

  const [latValue, lngValue] = decodeURIComponent(cookieValue).split(",");
  const lat = Number(latValue);
  const lng = Number(lngValue);
  const location = { lat, lng };

  return isValidLocation(location) ? location : null;
}

export function isValidLocation(location: {
  lat: number;
  lng: number;
}): boolean {
  return (
    Number.isFinite(location.lat) &&
    Number.isFinite(location.lng) &&
    location.lat >= -90 &&
    location.lat <= 90 &&
    location.lng >= -180 &&
    location.lng <= 180 &&
    (location.lat !== 0 || location.lng !== 0)
  );
}
