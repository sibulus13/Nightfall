import { type NextRequest, NextResponse } from "next/server";

const LAST_LOCATION_COOKIE_NAME = "nightfalls-last-location";
const STAY_ON_HOME_PARAM = "home";

export function middleware(request: NextRequest) {
  if (request.nextUrl.searchParams.has(STAY_ON_HOME_PARAM)) {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(LAST_LOCATION_COOKIE_NAME)?.value;

  if (!isValidLocationCookie(cookieValue)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/App", request.url));
}

export const config = {
  matcher: "/",
};

function isValidLocationCookie(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const [latValue, lngValue] = decodeURIComponent(value).split(",");
  const lat = Number(latValue);
  const lng = Number(lngValue);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    (lat !== 0 || lng !== 0)
  );
}
