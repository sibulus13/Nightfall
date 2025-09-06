import { useState, useCallback, useEffect } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  type MapCameraChangedEvent,
  type MapMouseEvent,
} from "@vis.gl/react-google-maps";
import { useSelector, useDispatch } from "react-redux";
import {
  addMarker,
  removeMarker,
  clearAllMarkers,
  fetchBatchPredictions,
  setCurrentLocation,
} from "~/lib/map/mapSlice";
import type { RootState, AppDispatch } from "~/lib/store";
import { Button } from "~/components/ui/button";
import { useMapData } from "~/hooks/useMapData";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Play, Trash2, ChevronDown } from "lucide-react";
import CelestialIndicators from "./celestialIndicators";

interface SunsetMapProps {
  initialLocation?: {
    lat: number;
    lng: number;
  };
  zoomLevel?: number;
  minZoom?: number;
  maxZoom?: number;
  onLocationChange?: (location: { lat: number; lng: number }) => void;
}

const mapContainerStyle = {
  width: "100%",
  height: "400px",
};

const SunsetMap: React.FC<SunsetMapProps> = ({
  initialLocation,
  zoomLevel = 10,
  minZoom = 3,
  maxZoom = 18,
  onLocationChange,
}) => {
  const [center, setCenter] = useState(initialLocation);
  const [currentZoom, setCurrentZoom] = useState(zoomLevel);
  const dispatch = useDispatch<AppDispatch>();

  // Get markers from Redux store
  const markers = useSelector((state: RootState) => state.map.markers);
  const { isCalculating, selectedDayIndex, predictions } = useSelector(
    (state: RootState) => state.map,
  );

  // Use map data hook for date options and day selection
  const { dateOptions, updateSelectedDay, availableDates } = useMapData({
    initialLocation,
  });

  // Function to get gradient background based on prediction score (matching predictions tab)
  const getScoreGradient = useCallback((score: number) => {
    const baseColors = ["from-orange-300 via-pink-400 to-purple-500"];
    const saturation = score; // Use score directly for saturation
    return { color: `${baseColors[0]}`, saturation: saturation };
  }, []);

  // Helper function to get prediction for the currently selected day
  const getPredictionForSelectedDay = useCallback(
    (markerId: string) => {
      const prediction = predictions[markerId];
      if (!prediction) {
        return null; // No prediction exists
      }

      // Check if the prediction is for the currently selected day
      if (dateOptions.length > 0 && dateOptions[selectedDayIndex]) {
        const selectedDate = dateOptions[selectedDayIndex].dateString;
        const predictionDate = prediction.sunset_time.includes("T")
          ? prediction.sunset_time.split("T")[0]
          : prediction.sunset_time;

        if (predictionDate === selectedDate) {
          return prediction; // Valid prediction for selected day
        }
      }

      return null; // Prediction exists but not for selected day
    },
    [predictions, dateOptions, selectedDayIndex],
  );

  // Helper function to check if a marker needs prediction for the selected day
  const markerNeedsPrediction = useCallback(
    (markerId: string) => {
      return getPredictionForSelectedDay(markerId) === null;
    },
    [getPredictionForSelectedDay],
  );

  // Handle generate predictions
  const handleGeneratePredictions = useCallback(() => {
    if (markers.length > 0) {
      const markersNeedingPredictions = markers.filter((marker) =>
        markerNeedsPrediction(marker.id),
      );

      if (markersNeedingPredictions.length > 0) {
        void dispatch(
          fetchBatchPredictions({
            markers: markersNeedingPredictions,
            dayIndex: selectedDayIndex,
            availableDates: availableDates,
          }),
        );
      }
    }
  }, [
    markers,
    selectedDayIndex,
    dispatch,
    markerNeedsPrediction,
    availableDates,
  ]);

  // Note: Removed auto-refresh when day changes - predictions only generate on button click

  // Get sunset time from any existing prediction for the selected day
  const getSunsetTimeForSelectedDay = useCallback(() => {
    if (markers.length === 0 || !dateOptions[selectedDayIndex])
      return undefined;

    // Get sunset time from the first marker's prediction for the selected day
    const firstMarker = markers[0];
    if (firstMarker) {
      const prediction = getPredictionForSelectedDay(firstMarker.id);
      return prediction?.sunset_time;
    }
    return undefined;
  }, [markers, dateOptions, selectedDayIndex, getPredictionForSelectedDay]);

  // Update center when initialLocation changes
  useEffect(() => {
    if (initialLocation) {
      setCenter(initialLocation);
    }
  }, [initialLocation]);

  // Helper function to calculate distance between two points
  const getDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
  };

  // Handle map clicks to add/remove markers
  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      // Prevent default behavior and stop propagation
      if (event.domEvent) {
        event.domEvent.preventDefault();
        event.domEvent.stopPropagation();
      }

      if (!event.detail?.latLng) {
        return;
      }

      const clickedLat = event.detail.latLng.lat;
      const clickedLng = event.detail.latLng.lng;

      // Check if click is near an existing marker (within ~100 meters for easier removal)
      const nearbyMarker = markers.find(
        (marker) =>
          getDistance(marker.lat, marker.lng, clickedLat, clickedLng) < 100,
      );

      if (nearbyMarker) {
        // Remove the nearby marker
        dispatch(removeMarker(nearbyMarker.id));
      } else if (markers.length < 5) {
        // Add new marker if we have less than 5
        dispatch(addMarker({ lat: clickedLat, lng: clickedLng }));
      }
    },
    [markers, dispatch],
  );

  const onBoundsChanged = useCallback(
    (event: MapCameraChangedEvent) => {
      // Update the center state when user drags the map
      if (event.detail.center) {
        const newCenter = {
          lat: event.detail.center.lat,
          lng: event.detail.center.lng,
        };
        setCenter(newCenter);

        // Save the new location to Redux store (which will save to localStorage)
        dispatch(setCurrentLocation(newCenter));

        // Notify parent component of location change
        if (onLocationChange) {
          onLocationChange(newCenter);
        }
      }

      // Update zoom state
      if (event.detail.zoom) {
        setCurrentZoom(event.detail.zoom);
      }
    },
    [onLocationChange, dispatch],
  );

  return (
    <div className="space-y-4">
      {/* Instructions and Controls - Above the Map */}
      <div className="space-y-4">
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Click on the map to place markers (up to 5). Click on existing
            markers to remove them.
          </p>
          <p className="mt-1">Markers placed: {markers.length}/5</p>
        </div>

        {/* Controls Row - Date Selector Left, Action Buttons Right */}
        <div className="flex items-center justify-between">
          {/* Day Selector - Left Side */}
          <div className="flex items-center">
            {dateOptions.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="min-w-[160px]">
                    {dateOptions[selectedDayIndex]?.label ?? "Select Day"}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {dateOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.index}
                      onClick={() => {
                        updateSelectedDay(option.index);
                      }}
                      className={
                        selectedDayIndex === option.index ? "bg-accent" : ""
                      }
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="min-w-[160px]" /> // Placeholder to maintain layout
            )}
          </div>

          {/* Action Buttons - Right Side */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleGeneratePredictions}
              disabled={markers.length === 0 || isCalculating}
              size="sm"
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isCalculating
                ? "Calculating..."
                : markers.length > 0 &&
                    markers.every((marker) => !markerNeedsPrediction(marker.id))
                  ? "Complete"
                  : "Predict"}
            </Button>

            {markers.length > 0 && (
              <Button
                onClick={() => dispatch(clearAllMarkers())}
                variant="outline"
                disabled={isCalculating}
                size="sm"
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="relative">
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}>
          <Map
            style={mapContainerStyle}
            center={center}
            zoom={currentZoom}
            minZoom={minZoom}
            maxZoom={maxZoom}
            gestureHandling={"greedy"}
            disableDefaultUI={false}
            scrollwheel={true}
            onBoundsChanged={onBoundsChanged}
            onClick={handleMapClick}
            mapId="sunset-map"
            clickableIcons={false}
            disableDoubleClickZoom={true}
          >
            {markers.map((marker, index) => {
              const prediction = getPredictionForSelectedDay(marker.id);
              const markerNumber = index + 1;
              const gradient = prediction
                ? getScoreGradient(prediction.score)
                : { color: "from-gray-400 to-gray-500", saturation: 100 };

              // Create custom gradient marker
              const customMarker = (
                <div
                  className="relative flex h-10 w-10 cursor-pointer items-center justify-center"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dispatch(removeMarker(marker.id));
                  }}
                >
                  {/* Gradient marker background */}
                  <div
                    className={`absolute inset-0 rounded-full bg-gradient-to-r ${gradient.color} shadow-lg`}
                    style={{
                      filter: `saturate(${gradient.saturation}%)`,
                    }}
                  />

                  {/* White border */}
                  <div className="absolute inset-0.5 rounded-full bg-white" />

                  {/* Inner gradient circle */}
                  <div
                    className={`absolute inset-1 rounded-full bg-gradient-to-r ${gradient.color}`}
                    style={{
                      filter: `saturate(${gradient.saturation}%)`,
                    }}
                  />

                  {/* Score or marker number */}
                  <div className="pointer-events-none relative z-10 flex flex-col items-center justify-center text-white">
                    {prediction ? (
                      <>
                        <div className="text-xs font-bold leading-none">
                          {Math.round(prediction.score)}
                        </div>
                        <div className="text-[8px] leading-none opacity-90">
                          #{markerNumber}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm font-bold">{markerNumber}</div>
                    )}
                  </div>

                  {/* Drop shadow pointer */}
                  <div
                    className={`absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gradient-to-r ${gradient.color} pointer-events-none shadow-lg`}
                    style={{
                      filter: `saturate(${gradient.saturation}%)`,
                    }}
                  />
                </div>
              );

              return (
                <AdvancedMarker
                  key={marker.id}
                  position={{ lat: marker.lat, lng: marker.lng }}
                  onClick={() => {
                    dispatch(removeMarker(marker.id));
                  }}
                >
                  {customMarker}
                </AdvancedMarker>
              );
            })}
          </Map>
        </APIProvider>

        {/* Celestial Indicators */}
        {center && dateOptions[selectedDayIndex] && (
          <CelestialIndicators
            center={center}
            selectedDate={dateOptions[selectedDayIndex].dateString}
            sunsetTime={getSunsetTimeForSelectedDay()}
          />
        )}
      </div>
    </div>
  );
};

export default SunsetMap;
