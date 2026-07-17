import { useState, useCallback, useEffect, useMemo, useRef } from "react";
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
import type { ScoreStats } from "~/lib/sunset/type";
import { Button } from "~/components/ui/button";
import { useMapData } from "~/hooks/useMapData";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Aperture,
  Binoculars,
  Camera,
  ChevronDown,
  Footprints,
  Landmark,
  Loader2,
  Mountain,
  Play,
  Plus,
  Sparkles,
  Trees,
  Trash2,
  Waves,
} from "lucide-react";
import CelestialIndicators from "./celestialIndicators";
import PhaseGuide from "./phaseGuide";
import { bearingToCompass } from "~/lib/sunset/bearing";
import type { SunsetSpot, SunsetSpotResponse } from "~/types/sunsetSpot";

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
  height: "100%",
};

const SUNSET_SPOT_RADIUS_METERS = 20000;
const SUNSET_SPOT_LIMIT = 12;
const SUNSET_SPOT_CACHE_TTL_MS = 15 * 60 * 1000;
const SUNSET_SPOT_CACHE_KEY_PREFIX = "sunset-app-spot-cache-v2";
const MAP_SETTLE_DELAY_MS = 900;
const MIN_RECOMMENDATION_MOVE_METERS = 900;
// Selected spot marker sits above all others so its detail card isn't covered.
const SELECTED_SPOT_Z_INDEX = 1000;

interface SunsetSpotCacheEntry {
  expiresAt: number;
  data: SunsetSpotResponse;
}

type SpotFilterGroup = "phases" | "locationTypes" | "features";

interface ActiveSpotFilters {
  phases: string[];
  locationTypes: string[];
  features: string[];
}

/** Wrap a longitude into the valid [-180, 180] range. */
function normalizeLongitude(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

const SunsetMap: React.FC<SunsetMapProps> = ({
  initialLocation,
  zoomLevel = 10,
  minZoom = 3,
  maxZoom = 18,
  onLocationChange,
}) => {
  const [center, setCenter] = useState(initialLocation);
  const [queryCenter, setQueryCenter] = useState(initialLocation);
  const [currentZoom, setCurrentZoom] = useState(zoomLevel);
  const [sunsetSpots, setSunsetSpots] = useState<SunsetSpot[]>([]);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [isLoadingSpots, setIsLoadingSpots] = useState(false);
  const [isRefiningSpots, setIsRefiningSpots] = useState(false);
  const [spotSource, setSpotSource] =
    useState<SunsetSpotResponse["source"] | null>(null);
  const [spotError, setSpotError] = useState<string | null>(null);
  const [activeSpotFilters, setActiveSpotFilters] =
    useState<ActiveSpotFilters>({
      phases: [],
      locationTypes: [],
      features: [],
    });
  const mapSettleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const lastRecommendationCenterRef = useRef(initialLocation);
  const dispatch = useDispatch<AppDispatch>();

  // Get markers from Redux store
  const markers = useSelector((state: RootState) => state.map.markers);
  const { isCalculating, selectedDayIndex, predictions, dayStats } = useSelector(
    (state: RootState) => state.map,
  );

  // Use map data hook for date options and day selection
  const { dateOptions, updateSelectedDay, availableDates } = useMapData({
    initialLocation,
  });
  const availableSpotFilters = useMemo(
    () => getAvailableSpotFilters(sunsetSpots),
    [sunsetSpots],
  );
  const filteredSunsetSpots = useMemo(() => {
    if (!hasActiveSpotFilters(activeSpotFilters)) {
      return sunsetSpots;
    }

    return sunsetSpots.filter((spot) =>
      doesSpotMatchFilters(spot, activeSpotFilters),
    );
  }, [activeSpotFilters, sunsetSpots]);

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
      setQueryCenter(initialLocation);
      lastRecommendationCenterRef.current = initialLocation;
    }
  }, [initialLocation]);

  const applySunsetSpotResponse = useCallback((data: SunsetSpotResponse) => {
    const candidates = data.candidates.map(normalizeSunsetSpot);

    setSunsetSpots(candidates);
    setSpotSource(data.source);
    setActiveSpotFilters((currentFilters) =>
      pruneActiveSpotFilters(currentFilters, candidates),
    );
    setSelectedSpotId((currentSelectedSpotId) => {
      if (
        currentSelectedSpotId &&
        candidates.some((spot) => spot.id === currentSelectedSpotId)
      ) {
        return currentSelectedSpotId;
      }

      return null;
    });
  }, []);

  useEffect(() => {
    const center = queryCenter;
    if (!center) {
      return;
    }

    const abortController = new AbortController();
    const signal = abortController.signal;

    const fetchSpots = async (
      includeTerrain: boolean,
    ): Promise<SunsetSpotResponse> => {
      const searchParams = new URLSearchParams({
        lat: String(center.lat),
        // Normalize at the API boundary too — guarantees a valid lon regardless
        // of how queryCenter was set (map pans can wrap past 180).
        lon: String(normalizeLongitude(center.lng)),
        radiusMeters: String(SUNSET_SPOT_RADIUS_METERS),
        limit: String(SUNSET_SPOT_LIMIT),
        terrain: String(includeTerrain),
      });
      const response = await fetch(
        `/api/locations/sunset-spots?${searchParams.toString()}`,
        { signal },
      );
      if (!response.ok) {
        throw new Error("Unable to load sunset spots");
      }
      return (await response.json()) as SunsetSpotResponse;
    };

    const loadSpots = async () => {
      setIsLoadingSpots(true);
      setSpotError(null);

      const cacheKey = getSunsetSpotCacheKey(center);
      const cachedResponse = getCachedSunsetSpotResponse(cacheKey);
      if (cachedResponse) {
        applySunsetSpotResponse(cachedResponse);
        setIsLoadingSpots(false);
        setIsRefiningSpots(false);
        return;
      }

      // Phase 1 — fast keyword-ranked paint (no terrain). Previous results stay
      // on screen until this resolves, so a search never flashes empty.
      let fastSucceeded = false;
      try {
        const fast = await fetchSpots(false);
        if (signal.aborted) return;
        applySunsetSpotResponse(fast);
        setIsLoadingSpots(false);
        setIsRefiningSpots(true);
        fastSucceeded = true;
      } catch {
        if (signal.aborted) return;
        // fall through to the full request as the primary attempt
      }

      // Phase 2 — terrain-refined scores; caches the full result.
      try {
        const full = await fetchSpots(true);
        if (signal.aborted) return;
        setCachedSunsetSpotResponse(cacheKey, full);
        applySunsetSpotResponse(full);
      } catch (error) {
        if (signal.aborted) return;
        if (!fastSucceeded) {
          console.error("Error loading sunset spots:", error);
          setSunsetSpots([]);
          setSpotSource(null);
          setSelectedSpotId(null);
          setSpotError("Could not load nearby sunset spots.");
        }
        // else: keep the fast results — terrain refine is best-effort.
      } finally {
        if (!signal.aborted) {
          setIsLoadingSpots(false);
          setIsRefiningSpots(false);
        }
      }
    };

    const timeout = setTimeout(() => void loadSpots(), 650);

    return () => {
      clearTimeout(timeout);
      abortController.abort();
    };
  }, [applySunsetSpotResponse, queryCenter]);

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

      // Clicking empty map space closes any open spot popup
      setSelectedSpotId(null);
    },
    [markers, dispatch],
  );

  const toggleSelectedSpot = useCallback((spotId: string) => {
    setSelectedSpotId((currentSelectedSpotId) =>
      currentSelectedSpotId === spotId ? null : spotId,
    );
  }, []);

  const addSpotToMarkers = useCallback(
    (spot: SunsetSpot) => {
      if (markers.length < 5) {
        dispatch(addMarker({ lat: spot.latitude, lng: spot.longitude }));
      }
    },
    [dispatch, markers.length],
  );

  const onBoundsChanged = useCallback(
    (event: MapCameraChangedEvent) => {
      const nextZoom = event.detail.zoom;
      // Keep the RAW longitude for the map's own state so the controlled center
      // matches where the user actually dragged (normalizing here snapped the
      // map back and broke panning). Longitude is wrapped into [-180,180] only
      // at the API boundaries (spots fetch + geocode).
      const nextCenter = event.detail.center
        ? {
            lat: event.detail.center.lat,
            lng: event.detail.center.lng,
          }
        : null;

      if (nextZoom) {
        setCurrentZoom(nextZoom);
      }

      // Update the center state when user drags the map
      if (!nextCenter) {
        return;
      }

      setCenter(nextCenter);

      if (mapSettleTimeoutRef.current) {
        clearTimeout(mapSettleTimeoutRef.current);
      }

      mapSettleTimeoutRef.current = setTimeout(() => {
        const lastRecommendationCenter = lastRecommendationCenterRef.current;
        const movedMeters = lastRecommendationCenter
          ? getDistance(
              lastRecommendationCenter.lat,
              lastRecommendationCenter.lng,
              nextCenter.lat,
              nextCenter.lng,
            )
          : MIN_RECOMMENDATION_MOVE_METERS;

        if (movedMeters < MIN_RECOMMENDATION_MOVE_METERS) {
          return;
        }

        lastRecommendationCenterRef.current = nextCenter;
        setQueryCenter(nextCenter);
        dispatch(setCurrentLocation(nextCenter));

        if (onLocationChange) {
          onLocationChange(nextCenter);
        }
      }, MAP_SETTLE_DELAY_MS);
    },
    [onLocationChange, dispatch],
  );

  useEffect(() => {
    return () => {
      if (mapSettleTimeoutRef.current) {
        clearTimeout(mapSettleTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 lg:grid lg:h-[calc(100vh-6rem)] lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-[minmax(0,1fr)] lg:gap-4 lg:overflow-hidden">
      {/* RIGHT RAIL — DOM-first so selectables sit ABOVE the map on mobile; moves to the right column on desktop. Scrolls internally so the outer frame stays one viewport. */}
      <div className="flex min-h-0 flex-col gap-3 lg:order-2 lg:h-full lg:overflow-y-auto lg:pr-1">
        {/* Compact controls (markers / day / Predict / Clear) */}
        <div className="nf-panel p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Day Selector */}
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
          <p className="mt-2 text-sm text-muted-foreground">
            Tap the map to place markers (up to 5); tap a marker to remove it ·{" "}
            {markers.length}/5 placed
          </p>
        </div>

        {/* Aggregate banner — once ≥2 markers have predictions */}
        {dayStats && <DayStatsBanner stats={dayStats} />}

        {/* Phase recommendations (output) */}
        <PhaseGuide
          spots={sunsetSpots}
          selectedSpotId={selectedSpotId}
          onSelectSpot={toggleSelectedSpot}
          isLoading={isLoadingSpots}
          isRefining={isRefiningSpots}
        />

        {/* Browse all nearby spots + filters */}
        <SunsetSpotsPanel
          spots={filteredSunsetSpots}
          availableFilters={availableSpotFilters}
          activeFilters={activeSpotFilters}
          selectedSpotId={selectedSpotId}
          isLoading={isLoadingSpots}
          source={spotSource}
          error={spotError}
          onToggleFilter={(group, value) => {
            setActiveSpotFilters((currentFilters) =>
              toggleSpotFilter(currentFilters, group, value),
            );
          }}
          onClearFilters={() =>
            setActiveSpotFilters({
              phases: [],
              locationTypes: [],
              features: [],
            })
          }
          onSelectSpot={toggleSelectedSpot}
        />
      </div>

      {/* MAP (output) — main column on desktop (h-full), below the rail on mobile */}
      <div className="nf-panel overflow-hidden lg:order-1 lg:h-full">
        <div className="relative h-[52vh] min-h-[320px] bg-[#fffaf2] dark:bg-[#211f1c] lg:h-full">
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

            {filteredSunsetSpots.map((spot) => {
              const isSelected = spot.id === selectedSpotId;

              return (
                <AdvancedMarker
                  key={spot.id}
                  position={{ lat: spot.latitude, lng: spot.longitude }}
                  onClick={() => toggleSelectedSpot(spot.id)}
                  // Raise the selected marker above all others so its open
                  // detail card isn't covered by neighbouring markers.
                  zIndex={isSelected ? SELECTED_SPOT_Z_INDEX : undefined}
                >
                  <SunsetSpotMarker
                    spot={spot}
                    isSelected={isSelected}
                    canAddMarker={markers.length < 5}
                    onAddSpot={addSpotToMarkers}
                    // Marker in the upper half of the map → open the popup
                    // downward so it isn't clipped by the top edge.
                    openDownward={center ? spot.latitude > center.lat : false}
                  />
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
    </div>
  );
};

function SunsetSpotMarker({
  spot,
  isSelected,
  canAddMarker,
  onAddSpot,
  openDownward,
}: {
  spot: SunsetSpot;
  isSelected: boolean;
  canAddMarker: boolean;
  onAddSpot: (spot: SunsetSpot) => void;
  openDownward: boolean;
}) {
  const MarkerIcon = getSpotMarkerIcon(spot);
  const notableQuality = getSpotMarkerLabel(spot);
  const visibleBadges = spot.qualificationBadges.slice(0, 2);

  return (
    <div className="relative flex flex-col items-center">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 text-white shadow-lg transition-transform ${
          isSelected
            ? "scale-125 border-white ring-4 ring-pink-300/55"
            : "border-white/85"
        }`}
        title={notableQuality}
      >
        <MarkerIcon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="h-2 w-2 -translate-y-1 rotate-45 border-b border-r border-white/80 bg-pink-500 shadow-sm" />

      {isSelected && (
        <div
          className={`absolute left-1/2 z-30 w-60 max-w-[80vw] -translate-x-1/2 rounded-md border border-[#e5c0ae] bg-[#fffaf4] p-3 text-[#231b17] shadow-xl dark:border-[#5b4037] dark:bg-[#221a20] dark:text-[#f8ede7] ${
            openDownward ? "top-full mt-2" : "bottom-full mb-2"
          }`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <div className="flex items-start gap-2">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 text-white">
              <MarkerIcon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{spot.name}</div>
              <div className="mt-0.5 text-xs text-[#665047] dark:text-[#d9c6bd]">
                {notableQuality} · {getPhaseLabel(spot.bestPhase)}
              </div>
            </div>
          </div>

          {visibleBadges.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {visibleBadges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full bg-[#f2dfd5] px-2 py-0.5 text-xs font-semibold text-[#5d3028] dark:bg-white/10 dark:text-[#f3d4ca]"
                >
                  {badge}
                </span>
              ))}
            </div>
          )}

          <div className="mt-2 text-xs text-[#665047] dark:text-[#d9c6bd]">
            Arrive by {formatSpotTime(spot.goldenHour.arriveBy)}
          </div>

          {/* Belt of Venus suitability — anti-solar (eastern) rose arch */}
          <div className="mt-2 rounded-md border border-pink-200/70 bg-pink-50/70 p-2 dark:border-pink-400/25 dark:bg-pink-400/10">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-pink-700 dark:text-pink-300">
                Belt of Venus
              </span>
              <span className="text-xs font-semibold text-pink-700 dark:text-pink-300">
                {Math.round(spot.phaseScores.beltOfVenus)}/100
              </span>
            </div>
            <div className="mt-0.5 text-xs text-[#7a4a3c] dark:text-[#f0c2b0]">
              Look {bearingToCompass(spot.viewingDirections.antisolarAzimuthDegrees)}
            </div>
            <div className="mt-1 text-xs leading-snug text-[#8a6a5c] dark:text-[#d9b3a6]">
              The rosy arch appears opposite the sunset — wants a clear eastern
              horizon.
            </div>
          </div>

          <button
            type="button"
            disabled={!canAddMarker}
            onClick={() => onAddSpot(spot)}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[#2a171d] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#4c2634] disabled:cursor-not-allowed disabled:opacity-55 dark:bg-[#ffd1ad] dark:text-[#21120d]"
            title={canAddMarker ? "Add this spot to predictions" : "Marker limit reached"}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {canAddMarker ? "Add to predictions" : "Marker limit reached"}
          </button>
        </div>
      )}
    </div>
  );
}

function SunsetSpotsPanel({
  spots,
  availableFilters,
  activeFilters,
  selectedSpotId,
  isLoading,
  source,
  error,
  onToggleFilter,
  onClearFilters,
  onSelectSpot,
}: {
  spots: SunsetSpot[];
  availableFilters: ActiveSpotFilters;
  activeFilters: ActiveSpotFilters;
  selectedSpotId: string | null;
  isLoading: boolean;
  source: SunsetSpotResponse["source"] | null;
  error: string | null;
  onToggleFilter: (group: SpotFilterGroup, value: string) => void;
  onClearFilters: () => void;
  onSelectSpot: (spotId: string) => void;
}) {
  const hasFilters = hasActiveSpotFilters(activeFilters);

  return (
    <aside className="nf-panel p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Camera className="h-4 w-4 text-orange-500" />
            Recommended spots
          </h3>
          <p className="text-xs text-muted-foreground">
            {source === "live-overpass"
              ? "Filtered from nearby map signals"
              : source === "mixed"
                ? "Map signals with local recommendations"
              : "Local recommendations"}
          </p>
        </div>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {(availableFilters.locationTypes.length > 0 ||
        availableFilters.features.length > 0) && (
        <div className="mb-3 space-y-2">
          <SpotFilterSection
            title="Location type"
            group="locationTypes"
            options={availableFilters.locationTypes}
            activeOptions={activeFilters.locationTypes}
            onToggleFilter={onToggleFilter}
          />
          <SpotFilterSection
            title="Scene qualities"
            group="features"
            options={availableFilters.features}
            activeOptions={activeFilters.features}
            onToggleFilter={onToggleFilter}
          />
          {hasFilters && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClearFilters}
                className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          {error}
        </div>
      )}

      {isLoading && spots.length === 0 && <SunsetSpotLoadingState />}

      <div className="mb-3 max-h-44 space-y-2 overflow-y-auto pr-1">
        {spots.length === 0 && !isLoading ? (
          <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
            No recommendations match those filters.
          </div>
        ) : (
          spots.map((spot) => (
            <button
              key={spot.id}
              type="button"
              onClick={() => onSelectSpot(spot.id)}
              className={`w-full rounded-md border p-2 text-left transition-colors ${
                spot.id === selectedSpotId
                  ? "border-[#a6532d] bg-[#fff4e8] text-[#2b241f] dark:bg-[#33241d] dark:text-[#f7e4d4]"
                  : "border-[#d9c8b6] bg-white/60 hover:bg-[#f5eee5] dark:border-[#3f3933] dark:bg-white/5 dark:hover:bg-white/10"
              }`}
              title={`Show ${spot.name} on the map`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex min-w-0 items-start gap-2">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 text-white">
                    {(() => {
                      const SpotIcon = getSpotMarkerIcon(spot);
                      return <SpotIcon className="h-3.5 w-3.5" aria-hidden="true" />;
                    })()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {spot.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {getSpotMarkerLabel(spot)} · {getPhaseLabel(spot.bestPhase)}
                    </span>
                  </span>
                </span>
                <span
                  className="shrink-0 rounded-full border border-[#e3c5b4] bg-white/70 px-2 py-0.5 text-xs font-semibold text-[#6f3a28] dark:border-white/10 dark:bg-white/10 dark:text-[#f0c2b0]"
                  aria-hidden="true"
                >
                  map
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="rounded-md border border-dashed border-[#dfc7b6] bg-white/45 p-2 text-xs text-muted-foreground dark:border-white/10 dark:bg-white/5">
        Select a spot to open its map popup. Add promising places from the popup
        and run predictions when you are ready.
      </div>
    </aside>
  );
}

function SunsetSpotLoadingState() {
  const loadingSteps = [
    "Reading golden-hour timing",
    "Checking horizon and water cues",
    "Comparing view angles",
    "Looking for reflection potential",
    "Ranking nearby recommendations",
  ];
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStepIndex((currentStepIndex) =>
        (currentStepIndex + 1) % loadingSteps.length,
      );
    }, 1200);

    return () => window.clearInterval(interval);
  }, [loadingSteps.length]);

  return (
    <div className="mb-3 rounded-md border border-orange-200 bg-orange-50 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-orange-950">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {loadingSteps[stepIndex]}
      </div>
      <div className="grid grid-cols-5 gap-1">
        {loadingSteps.map((step, index) => (
          <div
            key={step}
            className={`h-1 rounded-full ${
              index <= stepIndex ? "bg-orange-400" : "bg-orange-100"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function SpotFilterSection({
  title,
  group,
  options,
  activeOptions,
  onToggleFilter,
}: {
  title: string;
  group: SpotFilterGroup;
  options: string[];
  activeOptions: string[];
  onToggleFilter: (group: SpotFilterGroup, value: string) => void;
}) {
  if (options.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const isActive = activeOptions.includes(option);

          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggleFilter(group, option)}
              className={`rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "border-[#a6532d] bg-[#efe1d1] text-[#3d3128] dark:bg-[#4b3326] dark:text-[#f7e4d4]"
                    : "border-[#d9c8b6] bg-white/60 text-muted-foreground hover:text-foreground dark:border-[#3f3933] dark:bg-white/5"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatSpotTime(value: string): string {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getAvailableSpotFilters(spots: SunsetSpot[]): ActiveSpotFilters {
  return {
    phases: getTopFilterValues(spots.flatMap(getSpotPhaseFilters), 8),
    locationTypes: getTopFilterValues(spots.map(getLocationTypeFilter), 8),
    features: getTopFilterValues(spots.flatMap(getSceneQualityFilters), 10),
  };
}

function getTopFilterValues(values: string[], limit: number): string[] {
  const counts = new globalThis.Map<string, number>();

  values
    .filter((value) => value.length > 0)
    .forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value]) => value);
}

function getSpotPhaseFilters(spot: SunsetSpot): string[] {
  return Array.from(
    new Set([
      normalizeFilterLabel(getPhaseLabel(spot.bestPhase)),
      ...spot.recommendedFor.map(normalizeFilterLabel),
    ]),
  );
}

function getLocationTypeFilter(spot: SunsetSpot): string {
  return normalizeFilterLabel(spot.kind);
}

function getSceneQualityFilters(spot: SunsetSpot): string[] {
  const phaseLabels = new Set(getSpotPhaseFilters(spot));
  const locationType = getLocationTypeFilter(spot);

  return Array.from(
    new Set(
      [...spot.qualificationBadges, ...spot.searchTags]
        .map(normalizeFilterLabel)
        .filter(
          (tag) =>
            tag.length > 0 && tag !== locationType && !phaseLabels.has(tag),
        ),
    ),
  ).slice(0, 8);
}

function doesSpotMatchFilters(
  spot: SunsetSpot,
  activeFilters: ActiveSpotFilters,
): boolean {
  return (
    matchesAnyFilter(getSpotPhaseFilters(spot), activeFilters.phases) &&
    matchesAnyFilter([getLocationTypeFilter(spot)], activeFilters.locationTypes) &&
    matchesAnyFilter(getSceneQualityFilters(spot), activeFilters.features)
  );
}

function matchesAnyFilter(values: string[], activeValues: string[]): boolean {
  if (activeValues.length === 0) {
    return true;
  }

  return activeValues.some((activeValue) => values.includes(activeValue));
}

function hasActiveSpotFilters(activeFilters: ActiveSpotFilters): boolean {
  return (
    activeFilters.phases.length > 0 ||
    activeFilters.locationTypes.length > 0 ||
    activeFilters.features.length > 0
  );
}

function toggleSpotFilter(
  activeFilters: ActiveSpotFilters,
  group: SpotFilterGroup,
  value: string,
): ActiveSpotFilters {
  const currentValues = activeFilters[group];
  const nextValues = currentValues.includes(value)
    ? currentValues.filter((currentValue) => currentValue !== value)
    : [...currentValues, value];

  return {
    ...activeFilters,
    [group]: nextValues,
  };
}

function pruneActiveSpotFilters(
  activeFilters: ActiveSpotFilters,
  spots: SunsetSpot[],
): ActiveSpotFilters {
  const availableFilters = getAvailableSpotFilters(spots);

  return {
    phases: activeFilters.phases.filter((phase) =>
      availableFilters.phases.includes(phase),
    ),
    locationTypes: activeFilters.locationTypes.filter((locationType) =>
      availableFilters.locationTypes.includes(locationType),
    ),
    features: activeFilters.features.filter((feature) =>
      availableFilters.features.includes(feature),
    ),
  };
}

function normalizeFilterLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function normalizeSunsetSpot(spot: SunsetSpot): SunsetSpot {
  const legacySpot = spot as SunsetSpot & {
    phaseScores?: SunsetSpot["phaseScores"];
    bestPhase?: SunsetSpot["bestPhase"];
    recommendedFor?: SunsetSpot["recommendedFor"];
    viewingDirections?: SunsetSpot["viewingDirections"];
  };
  const phaseScores = legacySpot.phaseScores ?? {
    goldenHour: spot.viewQualityScore,
    sunDisk: spot.westwardViewScore,
    beltOfVenus: spot.viewQualityScore,
    civilTwilight: spot.scenicScore,
    blueHour: spot.viewQualityScore,
  };

  return {
    ...spot,
    phaseScores,
    bestPhase: legacySpot.bestPhase ?? getBestPhaseFromScores(phaseScores),
    recommendedFor:
      legacySpot.recommendedFor?.length > 0
        ? legacySpot.recommendedFor
        : [getPhaseLabel(getBestPhaseFromScores(phaseScores))],
    viewingDirections: legacySpot.viewingDirections ?? {
      sunsetAzimuthDegrees: 270,
      antisolarAzimuthDegrees: 90,
      sideLightAzimuthDegrees: [180, 0],
    },
  };
}

function getBestPhaseFromScores(
  phaseScores: SunsetSpot["phaseScores"],
): SunsetSpot["bestPhase"] {
  return (Object.entries(phaseScores).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "goldenHour") as SunsetSpot["bestPhase"];
}

function getPhaseLabel(phase: SunsetSpot["bestPhase"]): string {
  const labels: Record<SunsetSpot["bestPhase"], string> = {
    goldenHour: "golden hour",
    sunDisk: "sun disk",
    beltOfVenus: "Belt of Venus",
    civilTwilight: "civil twilight",
    blueHour: "blue hour",
  };

  return labels[phase];
}

function getSpotMarkerIcon(spot: SunsetSpot): typeof Camera {
  const searchableText = [
    spot.kind,
    ...spot.qualificationBadges,
    ...spot.searchTags,
    ...spot.recommendedFor,
    getPhaseLabel(spot.bestPhase),
  ]
    .join(" ")
    .toLowerCase();

  if (/beach|water|river|lake|ocean|pier|reflection/.exec(searchableText)) {
    return Waves;
  }

  if (/mountain|elevation|ridge|hill|lookout|viewpoint/.exec(searchableText)) {
    return Mountain;
  }

  if (/trail|walk|path|hike/.exec(searchableText)) {
    return Footprints;
  }

  if (/park|garden|forest|green/.exec(searchableText)) {
    return Trees;
  }

  if (/lighthouse|landmark|tower|bridge|skyline/.exec(searchableText)) {
    return Landmark;
  }

  if (/venus|twilight|blue hour|purple|pink/.exec(searchableText)) {
    return Sparkles;
  }

  if (/foreground|composition|photo|camera/.exec(searchableText)) {
    return Aperture;
  }

  return Binoculars;
}

function getSpotMarkerLabel(spot: SunsetSpot): string {
  const kind = normalizeFilterLabel(spot.kind);
  const sceneQuality =
    spot.qualificationBadges[0] ?? spot.searchTags[0] ?? "Photo spot";

  return normalizeFilterLabel(sceneQuality || kind);
}

function getSunsetSpotCacheKey(center: { lat: number; lng: number }): string {
  return [
    SUNSET_SPOT_CACHE_KEY_PREFIX,
    center.lat.toFixed(3),
    center.lng.toFixed(3),
    SUNSET_SPOT_RADIUS_METERS,
    SUNSET_SPOT_LIMIT,
  ].join(":");
}

function getCachedSunsetSpotResponse(
  cacheKey: string,
): SunsetSpotResponse | null {
  try {
    const rawCacheEntry = localStorage.getItem(cacheKey);

    if (!rawCacheEntry) {
      return null;
    }

    const cacheEntry = JSON.parse(rawCacheEntry) as SunsetSpotCacheEntry;

    if (cacheEntry.expiresAt <= Date.now()) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return cacheEntry.data;
  } catch {
    localStorage.removeItem(cacheKey);
    return null;
  }
}

function setCachedSunsetSpotResponse(
  cacheKey: string,
  data: SunsetSpotResponse,
): void {
  const cacheEntry: SunsetSpotCacheEntry = {
    data,
    expiresAt: Date.now() + SUNSET_SPOT_CACHE_TTL_MS,
  };

  try {
    localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
  } catch {
    // Best effort only; localStorage can be full or disabled.
  }
}

function DayStatsBanner({ stats }: { stats: ScoreStats }) {
  const low  = Math.max(0, stats.mean - stats.std);
  const high = Math.min(100, stats.mean + stats.std);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm">
      <div className="mb-2 flex items-center justify-between text-white/70">
        <span>
          Area avg <span className="font-semibold text-white">{stats.mean}%</span>
          {" "}+/-{stats.std}
        </span>
        <span className="text-white/50">
          {stats.count} location{stats.count !== 1 ? "s" : ""}
          {" / "}range {stats.min}-{stats.max}%
        </span>
      </div>
      {/* Linear range bar */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
        {/* +/-1sigma band */}
        <div
          className="absolute h-full bg-gradient-to-r from-orange-400/60 via-pink-400/70 to-purple-400/60"
          style={{ left: `${low}%`, width: `${high - low}%` }}
        />
        {/* Mean tick */}
        <div
          className="absolute h-full w-0.5 bg-white"
          style={{ left: `${stats.mean}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs text-white/40">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>
  );
}

export default SunsetMap;

