import { useState, useCallback, useEffect } from "react";
import {
  APIProvider,
  Map,
  Marker,
  type MapCameraChangedEvent,
} from "@vis.gl/react-google-maps";
import { useDebounce } from "~/hooks/useDebounce";
import { useMapData } from "~/hooks/useMapData";

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

  // Use global map data
  const {
    predictions,
    loadingStates,
    isCalculating,
    selectedDayIndex,
    visibleMarkers,
    dateOptions,
    generateMarkers,
    updateSelectedDay,
  } = useMapData({
    initialLocation,
    gridRows,
    gridColumns,
    topScorePercentage,
  });

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
    generateMarkers(debouncedBounds);
  }, [debouncedBounds, generateMarkers]);

  const onBoundsChanged = useCallback((event: MapCameraChangedEvent) => {
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
            onChange={(e) => updateSelectedDay(Number(e.target.value))}
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
                  onClick={() => {
                    if (prediction) {
                      // You can add a callback here to show detailed information
                      console.log("Marker clicked:", prediction);
                    }
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
