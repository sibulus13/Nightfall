import { useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";

import {
    setMarkers,
    setCurrentLocation,
    fetchAvailableDates,
    fetchBatchPredictions,
    setSelectedDayIndex,
    resetMap,
    clearRateLimit
} from "~/lib/map/mapSlice";
import type { RootState, AppDispatch } from "~/lib/store";
import { useDispatch } from "react-redux";
import { areCoordinatesEqual } from "~/lib/utils";

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

    // Update current location when initialLocation changes
    useEffect(() => {
        if (initialLocation && (
            !currentLocation ||
            !areCoordinatesEqual(currentLocation, initialLocation)
        ) && !isRateLimited) {
            dispatch(setCurrentLocation(initialLocation));
            // Fetch available dates for the new location
            void dispatch(fetchAvailableDates({
                lat: initialLocation.lat,
                lng: initialLocation.lng,
            }));
        }
    }, [initialLocation, currentLocation, dispatch, isRateLimited]);

    // Generate grid markers when bounds change
    const generateMarkers = useCallback((bounds: {
        north: number;
        south: number;
        east: number;
        west: number;
    }, zoom?: number) => {
        if (!bounds) return;

        // Use consistent grid size regardless of zoom level
        const adjustedGridRows = gridRows;
        const adjustedGridColumns = gridColumns;

        // Add padding to create some space from the edges
        const padding = 0.15;
        const latPadding = (bounds.north - bounds.south) * padding;
        const lngPadding = (bounds.east - bounds.west) * padding;

        const paddedNorth = bounds.north - latPadding;
        const paddedSouth = bounds.south + latPadding;
        const paddedEast = bounds.east - lngPadding;
        const paddedWest = bounds.west + lngPadding;

        const latStep = (paddedNorth - paddedSouth) / (adjustedGridRows - 1);
        const lngStep = (paddedEast - paddedWest) / (adjustedGridColumns - 1);

        const newMarkers: Array<{ lat: number; lng: number; id: string }> = [];

        for (let row = 0; row < adjustedGridRows; row++) {
            // Stagger each row by offsetting the longitude
            const rowOffset = (row % 2) * (lngStep * 0.5);

            for (let col = 0; col < adjustedGridColumns; col++) {
                const lat = paddedSouth + latStep * row;
                const lng = paddedWest + lngStep * col + rowOffset;

                newMarkers.push({
                    lat,
                    lng,
                    id: `marker-${row}-${col}`,
                });
            }
        }

        // Clear existing predictions when generating new markers to force recalculation
        dispatch(setMarkers(newMarkers));
    }, [gridRows, gridColumns, dispatch]);

    // Single useEffect to handle all prediction fetching with batching
    useEffect(() => {
        if (markers.length > 0 && availableDates.length > 0 && !isRateLimited) {
            // When selectedDayIndex changes, we need to refetch all predictions
            // When markers change, we only fetch for new markers
            const markersNeedingPredictions = markers.filter(marker => {
                const prediction = predictions[marker.id];
                const isLoading = loadingStates[marker.id];
                // If we have a prediction, check if it's for the current selected day
                if (prediction) {
                    const predictionDate = new Date(prediction.sunset_time + "Z");
                    const selectedDate = new Date(availableDates[selectedDayIndex] + "T00:00:00");
                    const isSameDay = predictionDate.toDateString() === selectedDate.toDateString();
                    return !isSameDay && !isLoading;
                }
                return !prediction && !isLoading;
            });

            if (markersNeedingPredictions.length > 0) {
                // Use batch prediction for better performance
                void dispatch(fetchBatchPredictions({
                    markers: markersNeedingPredictions,
                    dayIndex: selectedDayIndex,
                }));
            }
        }
    }, [markers, selectedDayIndex, availableDates, predictions, loadingStates, dispatch, isRateLimited]);

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