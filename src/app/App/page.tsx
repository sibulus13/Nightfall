"use client";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { type Prediction } from "~/lib/sunset/type";
import { TbSunset2 } from "react-icons/tb";
import { MapPin, Route, Search } from "lucide-react";
import { TooltipProvider } from "~/components/ui/tooltip";

import Locator from "~/components/locator";
import SunsetMap from "~/components/sunsetMap";
import PredictionCard from "~/components/predictionCard";
import { useSelector } from "react-redux";
import usePrediction from "~/hooks/usePrediction";
import { useMapData } from "~/hooks/useMapData";
import {
  clearRateLimit,
  hydrateFromLocalStorage,
  setCurrentLocation as setMapCurrentLocation,
} from "~/lib/map/mapSlice";
import { useDispatch } from "react-redux";
import { areCoordinatesEqual } from "~/lib/utils";
import CacheDebugger from "~/components/CacheDebugger";
import {
  readBrowserLocationPreference,
  saveBrowserLocationPreference,
} from "~/lib/browser/locationPersistence";

const getScoreGradient = (score: number) => {
  const baseColors = ["from-orange-300 via-pink-400 to-purple-500"];
  const saturation = score; // Use score directly for saturation
  return { color: `${baseColors[0]}`, saturation: saturation };
};

const truncateScore = (score: number, lowerLimit = 0, upperLimit = 100) => {
  const range = upperLimit - lowerLimit;
  score = (score / 100) * range + lowerLimit;
  return score.toFixed(0);
};

type AppTab = "predictions" | "map";

const APP_ACTIVE_TAB_STORAGE_KEY = "sunset-app-active-tab";
const URL_COORDINATE_MIN = -180;
const URL_COORDINATE_MAX = 180;

// Function to get location name from coordinates
const getLocationName = async (
  lat: number,
  lng: number,
): Promise<string | null> => {
  try {
    // Wrap longitude into [-180,180] — the map can report a wrapped value after
    // panning around the globe, which the geocoder rejects with 400.
    const normalizedLng = ((((lng + 180) % 360) + 360) % 360) - 180;
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${normalizedLng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`,
    );
    const data = (await response.json()) as {
      results?: Array<{
        address_components: Array<{
          types: string[];
          long_name: string;
        }>;
        formatted_address: string;
      }>;
    };

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      if (result) {
        // Try to get the most specific location name
        const locality = result.address_components.find(
          (component) =>
            component.types.includes("locality") ||
            component.types.includes("administrative_area_level_1"),
        );

        if (locality) {
          return locality.long_name;
        }

        // Fallback to formatted address
        return result.formatted_address.split(",")[0] ?? null;
      }
    }
  } catch (error) {
    console.error("Error fetching location name:", error);
  }
  return null;
};

function getUrlLocation(): { lat: number; lng: number } | null {
  if (typeof window === "undefined") {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lon") ?? searchParams.get("lng"));

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < URL_COORDINATE_MIN ||
    lng > URL_COORDINATE_MAX
  ) {
    return null;
  }

  return { lat, lng };
}

function hasPersistedLocation(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (readBrowserLocationPreference()) {
    return true;
  }

  const lat = Number(localStorage.getItem("lat"));
  const lon = Number(localStorage.getItem("lon"));

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat !== 0 &&
    lon !== 0 &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= URL_COORDINATE_MIN &&
    lon <= URL_COORDINATE_MAX
  );
}

export default function AppPage() {
  const { predict } = usePrediction();
  const dispatch = useDispatch();
  const [currentLocation, setCurrentLocation] = useState({ lat: 0, lng: 0 });
  const [activeTab, setActiveTab] = useState<AppTab>("predictions");
  const [isActiveTabHydrated, setIsActiveTabHydrated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [locationName, setLocationName] = useState<string>("");
  const mapLocationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasAppliedUrlLocationRef = useRef(false);

  // Memoize the initial location to prevent unnecessary re-renders
  const memoizedInitialLocation = useMemo(() => {
    return currentLocation.lat !== 0 && currentLocation.lng !== 0
      ? currentLocation
      : undefined;
  }, [currentLocation]);

  // Initialize map data hook to preload data
  useMapData({
    initialLocation: memoizedInitialLocation,
  });

  const prediction = useSelector(
    (state: { prediction: { prediction: Prediction[] } }) =>
      state.prediction.prediction,
  );

  // Get rate limit state and current location from map slice
  const {
    isRateLimited,
    rateLimitMessage,
    currentLocation: mapLocation,
    currentLocationName: mapLocationName,
    availableDates,
  } = useSelector(
    (state: {
      map: {
        isRateLimited: boolean;
        rateLimitMessage: string;
        currentLocation: { lat: number; lng: number } | null;
        currentLocationName: string | null;
        availableDates: string[];
      };
    }) => state.map,
  );

  // Hydrate state from localStorage on client-side mount
  useEffect(() => {
    dispatch(hydrateFromLocalStorage());
  }, [dispatch]);

  useEffect(() => {
    const savedTab = localStorage.getItem(APP_ACTIVE_TAB_STORAGE_KEY);
    const urlTab = new URLSearchParams(window.location.search).get("tab");
    const hasLocationContext = Boolean(getUrlLocation()) || hasPersistedLocation();

    if (urlTab === "map" || urlTab === "predictions") {
      setActiveTab(urlTab);
    } else if (
      hasLocationContext &&
      (savedTab === "map" || savedTab === "predictions")
    ) {
      setActiveTab(savedTab);
    } else {
      setActiveTab("predictions");
    }

    setIsActiveTabHydrated(true);
  }, []);

  useEffect(() => {
    if (!isActiveTabHydrated) {
      return;
    }

    localStorage.setItem(APP_ACTIVE_TAB_STORAGE_KEY, activeTab);
  }, [activeTab, isActiveTabHydrated]);

  // Note: Removed auto-switching to map tab - user stays on predictions tab by default

  async function setPlace(place: google.maps.places.PlaceResult | null) {
    const lat = place?.geometry?.location?.lat();
    const lon = place?.geometry?.location?.lng();
    if (!lat || !lon) {
      return;
    }

    // Check if this is the same location to avoid unnecessary API calls
    if (areCoordinatesEqual(currentLocation, { lat, lng: lon })) {
      return;
    }

    setCurrentLocation({ lat, lng: lon });

    // Set location name from place result
    if (place?.formatted_address) {
      setLocationName(place.formatted_address.split(",")[0] ?? "");
    } else {
      // Fallback to reverse geocoding
      const name = await getLocationName(lat, lon);
      if (name) setLocationName(name);
    }

    await predict({ lat, lon });
  }

  function setUserLocation() {
    if (navigator.geolocation) {
      navigator?.geolocation?.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        // Check if this is the same location to avoid unnecessary API calls
        if (areCoordinatesEqual(currentLocation, { lat, lng: lon })) {
          return;
        }

        setCurrentLocation({ lat, lng: lon });

        // Get location name from coordinates
        void getLocationName(lat, lon).then((name) => {
          if (name) setLocationName(name);
        });

        predict({ lat, lon }).catch(console.error);
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }

  // Handle location changes from the map (no automatic predictions)
  const handleMapLocationChange = useCallback(
    (location: { lat: number; lng: number }) => {
      // Check if this is the same location to avoid unnecessary API calls
      if (areCoordinatesEqual(currentLocation, location)) {
        return;
      }

      setCurrentLocation(location);

      // Clear any existing timeout
      if (mapLocationTimeoutRef.current) {
        clearTimeout(mapLocationTimeoutRef.current);
      }

      // Debounce getting the location name only (no predictions)
      mapLocationTimeoutRef.current = setTimeout(() => {
        // Get location name from coordinates
        void getLocationName(location.lat, location.lng).then((name) => {
          if (name) setLocationName(name);
        });
      }, 1000); // Reduced debounce since we're only getting location name
    },
    [currentLocation],
  );

  useEffect(() => {
    // Only run this effect if we don't have a current location set
    if (currentLocation.lat === 0 && currentLocation.lng === 0) {
      const urlLocation = getUrlLocation();

      if (urlLocation && !hasAppliedUrlLocationRef.current) {
        hasAppliedUrlLocationRef.current = true;
        setCurrentLocation(urlLocation);
        setActiveTab("map");
        dispatch(setMapCurrentLocation(urlLocation));
        void getLocationName(urlLocation.lat, urlLocation.lng).then((name) => {
          if (name) setLocationName(name);
        });
        setIsInitialized(true);
        return;
      }

      // First check if there's a location in the map slice (from main page)
      if (mapLocation) {
        setCurrentLocation(mapLocation);
        // Always fetch predictions for the new location
        predict({ lat: mapLocation.lat, lon: mapLocation.lng }).catch(
          console.error,
        );
        // Prefer the name carried from the user's selection so the search bar
        // fills in immediately; only reverse-geocode as a fallback (that call
        // is also referrer-restricted and can fail on non-prod origins).
        if (mapLocationName) {
          setLocationName(mapLocationName);
        } else {
          void getLocationName(mapLocation.lat, mapLocation.lng).then((name) => {
            if (name) setLocationName(name);
          });
        }
      } else {
        // Fall back to localStorage
        const lat = Number(localStorage.getItem("lat"));
        const lon = Number(localStorage.getItem("lon"));
        if (lat && lon) {
          const savedLocation = { lat, lng: lon };

          setCurrentLocation(savedLocation);
          dispatch(setMapCurrentLocation(savedLocation));
          saveBrowserLocationPreference(savedLocation);
          // Always fetch predictions for the new location
          predict({ lat, lon }).catch(console.error);
          // Get location name
          void getLocationName(lat, lon).then((name) => {
            if (name) setLocationName(name);
          });
        }
      }
    }

    // Mark as initialized after the first run
    setIsInitialized(true);
  }, [
    currentLocation.lat,
    currentLocation.lng,
    dispatch,
    mapLocation,
    mapLocationName,
    predict,
  ]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (mapLocationTimeoutRef.current) {
        clearTimeout(mapLocationTimeoutRef.current);
      }
    };
  }, []);

  return (
    <TooltipProvider>
      <main className="nf-shell">
        <div className="nf-page space-y-5">
        {/* Rate limit error banner */}
        {isRateLimited && (
          <div className="mx-auto mb-4 w-full max-w-6xl">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-5 w-5 text-red-400">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-red-800">
                      Rate Limit Exceeded
                    </h3>
                    <p className="text-sm text-red-700">{rateLimitMessage}</p>
                  </div>
                </div>
                <button
                  onClick={() => dispatch(clearRateLimit())}
                  className="text-sm font-medium text-red-800 underline hover:text-red-900"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="nf-panel overflow-hidden">
          <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_420px] md:p-5">
            <div>
              <div className="nf-section-label">Planner</div>
              <h1 className="mt-1 text-3xl font-black md:text-4xl">
                Choose the sky, then choose the place.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Start with a forecast, then move into map scouting when you need
                viewpoints, phase fit, and recommended places nearby.
              </p>
              <div className="mt-4 grid gap-2 text-xs md:grid-cols-3">
                <WorkflowHint
                  icon={<Search className="h-4 w-4" />}
                  label="Search"
                  value="Pick an area"
                />
                <WorkflowHint
                  icon={<TbSunset2 className="h-4 w-4" />}
                  label="Forecast"
                  value="Check the sky"
                />
                <WorkflowHint
                  icon={<Route className="h-4 w-4" />}
                  label="Scout"
                  value="Compare spots"
                />
              </div>
            </div>
            <div className="self-center rounded-md border border-[#d9c8b6] bg-white/70 p-3 dark:border-[#3f3933] dark:bg-white/5">
              <Locator
                setSelectedPlace={setPlace}
                handleLocationClick={setUserLocation}
                value={locationName}
              />
            </div>
          </div>
        </section>

        <div className="w-full">
          <div className="mb-4 grid w-full grid-cols-2 rounded-md border border-[#d9c8b6] bg-[#fffaf2] p-1 dark:border-[#3f3933] dark:bg-[#211f1c]">
            <button
              onClick={() => setActiveTab("predictions")}
              className={`flex items-center justify-center gap-2 rounded px-3 py-2 text-sm font-semibold transition-all ${
                activeTab === "predictions"
                  ? "bg-[#253f3d] text-white shadow-sm dark:bg-[#f4d2ad] dark:text-[#191714]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TbSunset2 className="h-4 w-4" />
              Predictions
            </button>
            <button
              onClick={() => setActiveTab("map")}
              className={`flex items-center justify-center gap-2 rounded px-3 py-2 text-sm font-semibold transition-all ${
                activeTab === "map"
                  ? "bg-[#253f3d] text-white shadow-sm dark:bg-[#f4d2ad] dark:text-[#191714]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MapPin className="h-4 w-4" />
              Map View
            </button>
          </div>

          {/* Predictions Tab */}
          {activeTab === "predictions" && (
            <div className="space-y-4">
              {isInitialized &&
              currentLocation.lat !== 0 &&
              currentLocation.lng !== 0 &&
              prediction &&
              prediction.length > 0 ? (
                <div
                  className="group grid gap-3 md:grid-cols-2 lg:grid-cols-3"
                  style={{ alignItems: "center" }}
                >
                  {prediction.map((entry, i) => (
                    <PredictionCard
                      key={i}
                      prediction={entry}
                      onMapClick={() => {
                        setActiveTab("map");
                        // Extract date part directly from sunset_time to avoid timezone issues
                        const predictionDateOnly = entry.sunset_time.includes(
                          "T",
                        )
                          ? entry.sunset_time.split("T")[0]
                          : entry.sunset_time;

                        // Find the day index by comparing with available dates
                        const dayIndex = availableDates.findIndex(
                          (dateString: string) => {
                            return dateString === predictionDateOnly;
                          },
                        );

                        if (dayIndex >= 0) {
                          dispatch({
                            type: "map/setSelectedDayIndex",
                            payload: dayIndex,
                          });
                        }
                      }}
                      getScoreGradient={getScoreGradient}
                      truncateScore={truncateScore}
                    />
                  ))}
                </div>
              ) : (
                <div className="nf-panel flex h-64 items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <TbSunset2 className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p className="text-lg font-medium">
                      {!isInitialized
                        ? "Loading..."
                        : "Select a location to view predictions"}
                    </p>
                    <p className="text-sm">
                      {!isInitialized
                        ? "Please wait while we check for saved locations..."
                        : "Use the location selector above to see sunset predictions for your area."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Map Tab */}
          {activeTab === "map" && (
            <div className="space-y-4">
              {isInitialized &&
              currentLocation.lat !== 0 &&
              currentLocation.lng !== 0 ? (
                <SunsetMap
                  initialLocation={currentLocation}
                  onLocationChange={handleMapLocationChange}
                />
              ) : (
                <div className="nf-panel flex h-64 items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <MapPin className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p className="text-lg font-medium">
                      {!isInitialized
                        ? "Loading..."
                        : "Select a location to view map"}
                    </p>
                    <p className="text-sm">
                      {!isInitialized
                        ? "Please wait while we check for saved locations..."
                        : "Use the location selector above to see sunset predictions on the map."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        </div>
      </main>

      {/* Cache Debugger - Only show in development */}
      {process.env.NODE_ENV === "development" && <CacheDebugger />}
    </TooltipProvider>
  );
}

function WorkflowHint({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-[#f5eee5] px-3 py-2 dark:bg-white/10">
      <span className="text-[#8b3d22] dark:text-[#f0a36d]">{icon}</span>
      <span>
        <span className="block font-bold">{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </span>
    </div>
  );
}
