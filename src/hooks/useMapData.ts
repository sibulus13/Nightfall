import { useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { useDebounce } from "./useDebounce";
import {
    setMarkers,
    setCurrentLocation,
    fetchMarkerPrediction,
    fetchAvailableDates,
    setSelectedDayIndex,
    resetMap,
    clearRateLimit
} from "~/lib/map/mapSlice";
import type { RootState, AppDispatch } from "~/lib/store";
import { useDispatch } from "react-redux";

interface UseMapDataProps {
    initialLocation?: { lat: number; lng: number };
    gridRows?: number;
    gridColumns?: number;
    topScorePercentage?: number;
}

export const useMapData = ({
    initialLocation,
    gridRows = 5,
    gridColumns = 5,
    topScorePercentage = 20,
}: UseMapDataProps) => {
    const dispatch = useDispatch<AppDispatch>();



    // Select state from Redux store
    const {
        markers,
        predictions,
        loadingStates,
        isCalculating,
        availableDates,
        selectedDayIndex,
        currentLocation,
        isRateLimited,
        rateLimitMessage,
    } = useSelector((state: RootState) => state.map);

    // Debounce bounds changes to avoid too many API calls
    const debouncedBounds = useDebounce(null, 500); // We'll set this up later

    // Update current location when initialLocation changes
    useEffect(() => {
        if (initialLocation && (
            !currentLocation ||
            currentLocation.lat !== initialLocation.lat ||
            currentLocation.lng !== initialLocation.lng
        ) && !isRateLimited) {
            dispatch(setCurrentLocation(initialLocation));
            // Fetch available dates for the new location
            void dispatch(fetchAvailableDates({
                lat: initialLocation.lat,
                lng: initialLocation.lng,
            }));
        }
    }, [initialLocation, currentLocation, dispatch, isRateLimited]);

    // Generate grid markers when bounds change (placeholder for now)
    const generateMarkers = useCallback((bounds: {
        north: number;
        south: number;
        east: number;
        west: number;
    }) => {
        if (!bounds) return;

        // Add padding to create some space from the edges
        const padding = 0.15;
        const latPadding = (bounds.north - bounds.south) * padding;
        const lngPadding = (bounds.east - bounds.west) * padding;

        const paddedNorth = bounds.north - latPadding;
        const paddedSouth = bounds.south + latPadding;
        const paddedEast = bounds.east - lngPadding;
        const paddedWest = bounds.west + lngPadding;

        const latStep = (paddedNorth - paddedSouth) / (gridRows - 1);
        const lngStep = (paddedEast - paddedWest) / (gridColumns - 1);

        const newMarkers: Array<{ lat: number; lng: number; id: string }> = [];

        for (let row = 0; row < gridRows; row++) {
            // Stagger each row by offsetting the longitude
            const rowOffset = (row % 2) * (lngStep * 0.5);

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

        dispatch(setMarkers(newMarkers));
    }, [gridRows, gridColumns, dispatch]);

    // Fetch predictions for new markers
    useEffect(() => {
        if (markers.length > 0 && availableDates.length > 0 && !isRateLimited) {
            // Fetch predictions for all markers
            markers.forEach((marker) => {
                if (!predictions[marker.id]) {
                    void dispatch(fetchMarkerPrediction({
                        markerId: marker.id,
                        lat: marker.lat,
                        lng: marker.lng,
                        dayIndex: selectedDayIndex,
                    }));
                }
            });
        }
    }, [markers, selectedDayIndex, availableDates, dispatch, isRateLimited]);

    // Refresh predictions when selected day changes
    useEffect(() => {
        if (markers.length > 0 && availableDates.length > 0 && !isRateLimited) {
            // Clear existing predictions and refetch for new day
            markers.forEach((marker) => {
                void dispatch(fetchMarkerPrediction({
                    markerId: marker.id,
                    lat: marker.lat,
                    lng: marker.lng,
                    dayIndex: selectedDayIndex,
                }));
            });
        }
    }, [selectedDayIndex, markers, availableDates, dispatch, isRateLimited]);

    // Calculate which markers to show based on top scores
    const visibleMarkers = useMemo(() => {
        return markers.filter((marker) => {
            const prediction = predictions[marker.id];
            if (!prediction) return false;

            // Get all valid predictions with scores
            const validPredictions = Object.entries(predictions)
                .filter(([_, pred]) => pred !== null)
                .map(([id, pred]) => ({
                    id,
                    score: pred!.score,
                }))
                .sort((a, b) => b.score - a.score);

            // Calculate how many top scores to show
            const topCount = Math.max(
                1,
                Math.ceil(validPredictions.length * (topScorePercentage / 100))
            );
            const topScores = validPredictions.slice(0, topCount);
            const minScoreToShow = topScores[topScores.length - 1]?.score ?? 0;

            return prediction.score >= minScoreToShow;
        });
    }, [markers, predictions, topScorePercentage]);

    // Generate date options for the dropdown
    const dateOptions = useMemo(() => {
        return availableDates.map((dateString, index) => {
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
    }, [availableDates]);

    const updateSelectedDay = useCallback((dayIndex: number) => {
        dispatch(setSelectedDayIndex(dayIndex));
    }, [dispatch]);

    const clearMapData = useCallback(() => {
        dispatch(resetMap());
    }, [dispatch]);

    const clearRateLimitHandler = useCallback(() => {
        dispatch(clearRateLimit());
    }, [dispatch]);

    return {
        markers,
        predictions,
        loadingStates,
        isCalculating,
        availableDates,
        selectedDayIndex,
        currentLocation,
        isRateLimited,
        rateLimitMessage,
        visibleMarkers,
        dateOptions,
        generateMarkers,
        updateSelectedDay,
        clearMapData,
        clearRateLimit: clearRateLimitHandler,
    };
}; 