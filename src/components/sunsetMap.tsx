import { useState, useCallback, useEffect, useMemo } from "react";
import {
  APIProvider,
  Map,
  Marker,
  type MapCameraChangedEvent,
} from "@vis.gl/react-google-maps";
import { useDebounce } from "~/hooks/useDebounce";
import { getSunsetPrediction } from "~/lib/sunset/sunset";
import { type Prediction } from "~/lib/sunset/type";

interface SunsetMapProps {
  initialLocation?: {
    lat: number;
    lng: number;
  };
  zoomLevel?: number;
  minZoom?: number;
  maxZoom?: number;
  gridRows?: number;
  gridColumns?: number;
  topScorePercentage?: number; // Percentage of top scores to show (default 20%)
}

const mapContainerStyle = {
  width: "100%",
  height: "400px",
};

// Create a transparent 1x1 pixel image for markers
const transparentIcon = {
  url: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  scaledSize: { width: 1, height: 1 },
  anchor: { x: 0, y: 0 },
};

// Helper functions for score display
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

const SunsetMap: React.FC<SunsetMapProps> = ({
  initialLocation,
  zoomLevel = 10,
  minZoom = 3,
  maxZoom = 18,
  gridRows = 5,
  gridColumns = 5,
  topScorePercentage = 20,
}) => {
  const [center, setCenter] = useState(initialLocation);
  const [bounds, setBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);
  const [markers, setMarkers] = useState<
    Array<{ lat: number; lng: number; id: string }>
  >([]);
  const [predictions, setPredictions] = useState<
    Record<string, Prediction | null>
  >({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {},
  );
  const [isCalculating, setIsCalculating] = useState(true);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0); // 0 = today, 1 = tomorrow, etc.
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  // Generate date options based on available dates from API
  const dateOptions = useMemo(() => {
    if (availableDates.length === 0) return [];

    const options = availableDates.map((dateString, index) => {
      // Parse the date string correctly by adding 'T00:00:00' to ensure local timezone interpretation
      const date = new Date(dateString + "T00:00:00");
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
      const monthDay = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      // Check if this is today
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();

      return {
        index,
        label: isToday ? `Today (${monthDay})` : `${dayName} ${monthDay}`,
        date: date,
        dateString: dateString,
      };
    });

    return options;
  }, [availableDates]);

  // Debounce the bounds to avoid too many API calls
  const debouncedBounds = useDebounce(bounds, 500);

  // Update center when initialLocation changes
  useEffect(() => {
    if (initialLocation) {
      setCenter(initialLocation);
    }
  }, [initialLocation]);

  // Generate grid markers when bounds change
  useEffect(() => {
    if (!debouncedBounds) return;

    // Add padding to create some space from the edges (10% padding)
    const padding = 0.15;
    const latPadding =
      (debouncedBounds.north - debouncedBounds.south) * padding;
    const lngPadding = (debouncedBounds.east - debouncedBounds.west) * padding;

    const paddedNorth = debouncedBounds.north - latPadding;
    const paddedSouth = debouncedBounds.south + latPadding;
    const paddedEast = debouncedBounds.east - lngPadding;
    const paddedWest = debouncedBounds.west + lngPadding;

    const latStep = (paddedNorth - paddedSouth) / (gridRows - 1);
    const lngStep = (paddedEast - paddedWest) / (gridColumns - 1);

    const newMarkers: Array<{ lat: number; lng: number; id: string }> = [];

    for (let row = 0; row < gridRows; row++) {
      // Stagger each row by offsetting the longitude
      const rowOffset = (row % 2) * (lngStep * 0.5); // Alternate rows are offset by half a step

      for (let col = 0; col < gridColumns; col++) {
        const lat = paddedSouth + latStep * row;
        const lng = paddedWest + lngStep * col + rowOffset;

        newMarkers.push({
          lat,
          lng,
          id: `marker-${row}-${col}`,
        });
      }
    }

    setMarkers(newMarkers);
  }, [debouncedBounds, gridRows, gridColumns]);

  // Fetch predictions for new markers
  useEffect(() => {
    const fetchPredictions = async () => {
      setIsCalculating(true);
      const newLoadingStates: Record<string, boolean> = {};
      const newPredictions: Record<string, Prediction | null> = {};

      // Set loading state for all new markers
      markers.forEach((marker) => {
        if (!predictions[marker.id]) {
          newLoadingStates[marker.id] = true;
        }
      });

      setLoadingStates((prev) => ({ ...prev, ...newLoadingStates }));

      // Fetch predictions for each marker
      for (const marker of markers) {
        if (!predictions[marker.id]) {
          try {
            const predictionResults = await getSunsetPrediction(
              marker.lat,
              marker.lng,
            );
            // Get prediction for the selected day
            newPredictions[marker.id] =
              predictionResults[selectedDayIndex] ?? null;

            // Extract available dates from the first successful API call
            if (availableDates.length === 0 && predictionResults.length > 0) {
              // We need to get the actual dates from the API response
              // Since getSunsetPrediction doesn't return dates, we'll need to fetch them separately
              const url = `https://api.open-meteo.com/v1/forecast?latitude=${marker.lat}&longitude=${marker.lng}&hourly=weather_code,relative_humidity_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility&daily=sunrise,sunset,daylight_duration,sunshine_duration`;
              const res = await fetch(url);
              const forecast = (await res.json()) as {
                daily?: { time?: string[] };
              };
              if (forecast.daily?.time) {
                setAvailableDates(forecast.daily.time);
              }
            }
          } catch (error) {
            console.error(
              `Failed to fetch prediction for ${marker.id}:`,
              error,
            );
            newPredictions[marker.id] = null;
          }
          newLoadingStates[marker.id] = false;
        }
      }

      setPredictions((prev) => ({ ...prev, ...newPredictions }));
      setLoadingStates((prev) => ({ ...prev, ...newLoadingStates }));
      setIsCalculating(false);
    };

    if (markers.length > 0) {
      void fetchPredictions();
    }
  }, [markers, selectedDayIndex]); // Removed availableDates to prevent infinite loops

  // Refresh predictions when selected day changes
  useEffect(() => {
    const refreshPredictionsForDay = async () => {
      if (markers.length === 0 || Object.keys(predictions).length === 0) return;

      setIsCalculating(true);
      const newPredictions: Record<string, Prediction | null> = {};

      // Re-fetch predictions for all existing markers with the new day
      for (const marker of markers) {
        try {
          const predictionResults = await getSunsetPrediction(
            marker.lat,
            marker.lng,
          );
          newPredictions[marker.id] =
            predictionResults[selectedDayIndex] ?? null;
        } catch (error) {
          console.error(`Failed to fetch prediction for ${marker.id}:`, error);
          newPredictions[marker.id] = null;
        }
      }

      setPredictions(newPredictions); // Replace all predictions
      setIsCalculating(false);
    };

    void refreshPredictionsForDay();
  }, [selectedDayIndex, markers]); // Removed predictions to prevent infinite loops

  // Calculate which markers to show based on top scores
  const visibleMarkers = useMemo(() => {
    // Don't show any markers while calculating
    if (isCalculating || Object.keys(predictions).length === 0) {
      return [];
    }

    // Get all valid predictions with scores
    const validPredictions = Object.entries(predictions)
      .filter(([_, prediction]) => prediction !== null)
      .map(([id, prediction]) => ({
        id,
        score: prediction!.score,
        lat: markers.find((m) => m.id === id)?.lat ?? 0,
        lng: markers.find((m) => m.id === id)?.lng ?? 0,
      }))
      .sort((a, b) => b.score - a.score); // Sort by score descending

    // Calculate how many top scores to show
    const topCount = Math.max(
      1,
      Math.ceil(validPredictions.length * (topScorePercentage / 100)),
    );
    const topScores = validPredictions.slice(0, topCount);
    const minScoreToShow = topScores[topScores.length - 1]?.score ?? 0;

    // Return markers that meet the score threshold
    return markers.filter((marker) => {
      const prediction = predictions[marker.id];
      return prediction && prediction.score >= minScoreToShow;
    });
  }, [markers, predictions, isCalculating, topScorePercentage]);

  const onBoundsChanged = useCallback((event: MapCameraChangedEvent) => {
    console.log("Bounds changed:", event);

    // Update the center state when user drags the map
    if (event.detail.center) {
      setCenter({
        lat: event.detail.center.lat,
        lng: event.detail.center.lng,
      });
    }

    // Update bounds for grid generation
    if (event.detail.bounds) {
      setBounds(event.detail.bounds);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Date selector dropdown */}
      {
        <div className="flex items-center justify-start space-x-3">
          <select
            value={selectedDayIndex}
            onChange={(e) => setSelectedDayIndex(Number(e.target.value))}
            disabled={isCalculating}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {dateOptions.map((option) => (
              <option key={option.index} value={option.index}>
                {option.label}
              </option>
            ))}
          </select>
          {isCalculating && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-orange-500"></div>
              <span>Loading predictions...</span>
            </div>
          )}
        </div>
      }

      <div className="relative">
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}>
          <Map
            style={mapContainerStyle}
            center={center}
            zoom={zoomLevel}
            minZoom={minZoom}
            maxZoom={maxZoom}
            gestureHandling={"greedy"}
            disableDefaultUI={false}
            // zoomControl={true}
            scrollwheel={true}
            onBoundsChanged={onBoundsChanged}
          >
            {isCalculating && initialLocation && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
                <div className="rounded-lg bg-white p-4 shadow-lg">
                  <div className="flex items-center space-x-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-orange-500"></div>
                    <span className="text-lg font-semibold">
                      Calculating sunset scores...
                    </span>
                  </div>
                </div>
              </div>
            )}
            {visibleMarkers.map((marker) => {
              const prediction = predictions[marker.id] ?? null;
              const isLoading = loadingStates[marker.id] ?? false;

              let title = `Grid Point ${marker.id}`;
              if (prediction) {
                title = `Sunset Score: ${truncateScore(prediction.score)}%`;
              } else if (isLoading) {
                title = "Loading...";
              }

              return (
                <Marker
                  key={marker.id}
                  position={{ lat: marker.lat, lng: marker.lng }}
                  title={title}
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
                  icon={transparentIcon as any}
                  label={{
                    text: prediction
                      ? truncateScore(prediction.score)
                      : isLoading
                        ? "..."
                        : "?",
                    className: prediction
                      ? `bg-gradient-to-br ${getScoreGradient(prediction.score).color} text-white font-bold rounded-full px-2 py-1 text-xs`
                      : "bg-gray-400 text-white font-bold rounded-full px-2 py-1 text-xs",
                  }}
                />
              );
            })}
          </Map>
        </APIProvider>
      </div>
    </div>
  );
};

export default SunsetMap;
