"use client";
import { useEffect, useState, useMemo } from "react";
import { type Prediction } from "~/lib/sunset/type";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Hourglass } from "lucide-react";
import { BsSunset } from "react-icons/bs";
import { TbSunset2 } from "react-icons/tb";
import { MapPin } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import WeatherDisplay from "~/components/weatherDisplay";
import Locator from "~/components/locator";
import SunsetMap from "~/components/sunsetMap";
import { useSelector } from "react-redux";
import usePrediction from "~/hooks/usePrediction";
import { useMapData } from "~/hooks/useMapData";
import { formatDate, formatTime } from "~/lib/time/helper";
import { clearRateLimit } from "~/lib/map/mapSlice";
import { useDispatch } from "react-redux";
import { areCoordinatesEqual } from "~/lib/utils";
import CacheDebugger from "~/components/CacheDebugger";

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

export default function AppPage() {
  const { predict } = usePrediction();
  const dispatch = useDispatch();
  const [currentLocation, setCurrentLocation] = useState({ lat: 0, lng: 0 });
  const [activeTab, setActiveTab] = useState("predictions");
  const [isInitialized, setIsInitialized] = useState(false);

  // Memoize the initial location to prevent unnecessary re-renders
  const memoizedInitialLocation = useMemo(() => {
    return currentLocation.lat !== 0 && currentLocation.lng !== 0
      ? currentLocation
      : undefined;
  }, [currentLocation.lat, currentLocation.lng]);

  // Initialize map data hook to preload data
  const mapData = useMapData({
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
  } = useSelector(
    (state: {
      map: {
        isRateLimited: boolean;
        rateLimitMessage: string;
        currentLocation: { lat: number; lng: number } | null;
      };
    }) => state.map,
  );

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
    await predict({ lat, lon });
  }

  async function setUserLocation() {
    if (navigator.geolocation) {
      navigator?.geolocation?.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        // Check if this is the same location to avoid unnecessary API calls
        if (areCoordinatesEqual(currentLocation, { lat, lng: lon })) {
          return;
        }

        setCurrentLocation({ lat, lng: lon });
        predict({ lat, lon }).catch(console.error);
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }

  useEffect(() => {
    // Only run this effect if we don't have a current location set
    if (currentLocation.lat === 0 && currentLocation.lng === 0) {
      // First check if there's a location in the map slice (from main page)
      if (mapLocation) {
        setCurrentLocation(mapLocation);
        // Always fetch predictions for the new location
        predict({ lat: mapLocation.lat, lon: mapLocation.lng }).catch(
          console.error,
        );
      } else {
        // Fall back to localStorage
        const lat = Number(localStorage.getItem("lat"));
        const lon = Number(localStorage.getItem("lon"));
        if (lat && lon) {
          setCurrentLocation({ lat, lng: lon });
          // Always fetch predictions for the new location
          predict({ lat, lon }).catch(console.error);
        }
      }
    }

    // Mark as initialized after the first run
    setIsInitialized(true);
  }, [currentLocation.lat, currentLocation.lng, mapLocation, predict]);

  return (
    <TooltipProvider>
      <div className="page justify-center">
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

        <div className="flex justify-center p-2 py-4">
          <Locator
            setSelectedPlace={setPlace}
            handleLocationClick={setUserLocation}
          />
        </div>

        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-6 grid w-full grid-cols-2 rounded-lg bg-muted p-1">
            <button
              onClick={() => setActiveTab("predictions")}
              className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                activeTab === "predictions"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TbSunset2 className="h-4 w-4" />
              Predictions
            </button>
            <button
              onClick={() => setActiveTab("map")}
              className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                activeTab === "map"
                  ? "bg-background text-foreground shadow-sm"
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
                <div className="group grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {prediction.map((entry, i) => (
                    <Tooltip key={i}>
                      <TooltipTrigger asChild>
                        <Card
                          className={`bg-gradient-to-br ${getScoreGradient(entry.score).color} cursor-pointer transition-all duration-300 ease-in-out hover:scale-105 hover:!opacity-100 group-hover:opacity-60`}
                          style={{
                            filter: `saturate(${getScoreGradient(entry.score).saturation}%)`,
                          }}
                          onClick={() => {
                            setActiveTab("map");
                            // Set the selected day to match this prediction's date
                            const predictionDate = new Date(
                              entry.sunset_time + "Z",
                            );
                            const today = new Date();
                            const dayDiff = Math.floor(
                              (predictionDate.getTime() - today.getTime()) /
                                (1000 * 60 * 60 * 24),
                            );
                            if (dayDiff >= 0 && dayDiff < 7) {
                              dispatch({
                                type: "map/setSelectedDayIndex",
                                payload: dayDiff,
                              });
                            }
                          }}
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-semibold">
                              {formatDate(entry.sunset_time + "Z")}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <WeatherDisplay
                                weatherCode={entry.weather_code}
                              />
                              <div className="flex items-center justify-center">
                                <TbSunset2 className="mb-2 h-12 w-12 text-yellow-300" />
                                <span className="text-4xl font-bold">
                                  {truncateScore(entry.score) + "%"}
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-center gap-1 pt-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center space-x-1">
                                    <Hourglass className="h-6 w-6 text-yellow-300" />
                                    <span className="text-sm">
                                      {formatTime(entry.golden_hour.start)}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Golden Hour Start</p>
                                </TooltipContent>
                              </Tooltip>
                              -
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center space-x-1">
                                    <BsSunset className="h-6 w-6 text-orange-300" />
                                    <span className="text-sm">
                                      {formatTime(entry.sunset_time + "Z")}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Sunset Time</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </CardContent>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Click to view this prediction on the map</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center">
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
                <SunsetMap initialLocation={currentLocation} />
              ) : (
                <div className="flex h-64 items-center justify-center">
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

      {/* Cache Debugger - Only show in development */}
      {process.env.NODE_ENV === "development" && <CacheDebugger />}
    </TooltipProvider>
  );
}
