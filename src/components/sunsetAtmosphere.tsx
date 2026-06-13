"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const SUNSET_WINDOW_BEFORE_MINUTES = 90;
const SUNSET_WINDOW_AFTER_MINUTES = 45;
const VANCOUVER_LOCATION = { lat: 49.2827, lng: -123.1207 };
const MINUTES_PER_DAY = 1440;
const MINUTES_PER_DEGREE = 4;
const SOLAR_ZENITH_DEGREES = 90.833;

interface SunsetAtmosphereState {
  intensity: number;
  label: string;
}

export default function SunsetAtmosphere() {
  const [atmosphere, setAtmosphere] = useState<SunsetAtmosphereState | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;

    const applyAtmosphere = (location: { lat: number; lng: number }) => {
      const nextAtmosphere = getSunsetAtmosphere(location);

      if (isMounted) {
        setAtmosphere(nextAtmosphere);
      }
    };

    const applyFallback = () => {
      if (Intl.DateTimeFormat().resolvedOptions().timeZone === "America/Vancouver") {
        applyAtmosphere(VANCOUVER_LOCATION);
      }
    };

    if (!navigator.geolocation) {
      applyFallback();
      return () => {
        isMounted = false;
      };
    }

    if (navigator.permissions) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((permissionStatus) => {
          if (!isMounted) {
            return;
          }

          if (permissionStatus.state !== "granted") {
            applyFallback();
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (position) => {
              applyAtmosphere({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              });
            },
            applyFallback,
            { maximumAge: 15 * 60 * 1000, timeout: 1500 },
          );
        })
        .catch(applyFallback);
    } else {
      applyFallback();
    }

    return () => {
      isMounted = false;
    };
  }, []);

  if (!atmosphere || atmosphere.intensity <= 0) {
    return null;
  }

  return (
    <>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_22%_24%,rgba(255,139,77,0.62),transparent_30%),radial-gradient(circle_at_76%_18%,rgba(232,77,155,0.46),transparent_32%),linear-gradient(135deg,rgba(255,186,99,0.52),rgba(213,74,160,0.34)_48%,rgba(92,56,180,0.38))] transition-opacity duration-700"
        style={{ opacity: atmosphere.intensity }}
      />
      <div
        className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/45 bg-white/45 px-3 py-1 text-xs font-bold text-[#5b2144] shadow-sm backdrop-blur dark:bg-black/20 dark:text-[#ffd4f1]"
        title="Local sunset is close enough to tint the page."
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        {atmosphere.label}
      </div>
    </>
  );
}

function getSunsetAtmosphere(location: {
  lat: number;
  lng: number;
}): SunsetAtmosphereState | null {
  const now = new Date();
  const sunset = getEstimatedSunset(now, location.lat, location.lng);
  const minutesFromSunset = (now.getTime() - sunset.getTime()) / 60000;
  const isBeforeSunset =
    minutesFromSunset >= -SUNSET_WINDOW_BEFORE_MINUTES && minutesFromSunset < 0;
  const isAfterSunset =
    minutesFromSunset >= 0 && minutesFromSunset <= SUNSET_WINDOW_AFTER_MINUTES;

  if (!isBeforeSunset && !isAfterSunset) {
    return null;
  }

  const windowSize = isBeforeSunset
    ? SUNSET_WINDOW_BEFORE_MINUTES
    : SUNSET_WINDOW_AFTER_MINUTES;
  const intensity = Math.max(
    0.22,
    1 - Math.abs(minutesFromSunset) / windowSize,
  );

  return {
    intensity: Math.min(0.72, intensity),
    label: isBeforeSunset ? "sunset soon" : "afterglow",
  };
}

function getEstimatedSunset(date: Date, latitude: number, longitude: number): Date {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 0);
  const startOfToday = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  const dayOfYear = Math.floor((startOfToday - startOfYear) / 86400000);
  const gamma =
    ((2 * Math.PI) / 365) * (dayOfYear - 1 + (18 - 12) / 24);
  const equationOfTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const declination =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);
  const latitudeRadians = toRadians(latitude);
  const hourAngle = Math.acos(
    (Math.cos(toRadians(SOLAR_ZENITH_DEGREES)) /
      (Math.cos(latitudeRadians) * Math.cos(declination))) -
      Math.tan(latitudeRadians) * Math.tan(declination),
  );
  const hourAngleDegrees = toDegrees(hourAngle);
  const sunsetUtcMinutes =
    720 -
    MINUTES_PER_DEGREE * (longitude - hourAngleDegrees) -
    equationOfTime;
  const normalizedMinutes =
    ((sunsetUtcMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) %
    MINUTES_PER_DAY;

  return new Date(startOfToday + normalizedMinutes * 60000);
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}
