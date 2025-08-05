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

  console.log("Current center:", center);

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
      for (let col = 0; col < gridColumns; col++) {
        const lat = paddedSouth + latStep * row;
        const lng = paddedWest + lngStep * col;

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
            // Get today's prediction (first item in the array)
            newPredictions[marker.id] = predictionResults[0] ?? null;
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
  }, [markers, predictions]);

  // Calculate which markers to show based on top scores
  const visibleMarkers = useMemo(() => {
    if (isCalculating || Object.keys(predictions).length === 0) {
      return markers; // Show all markers while loading
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
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}>
      <Map
        style={mapContainerStyle}
        center={center}
        zoom={zoomLevel}
        minZoom={minZoom}
        maxZoom={maxZoom}
        gestureHandling={"greedy"}
        disableDefaultUI={false}
        zoomControl={true}
        scrollwheel={true}
        onBoundsChanged={onBoundsChanged}
      >
        {isCalculating && (
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
              icon={null}
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
  );
};

export default SunsetMap;
