import { useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";

import {
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
    topScorePercentage?: number;
}

export const useMapData = ({
    initialLocation,
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

    // Fetch available dates when we have markers but no dates yet
    useEffect(() => {
        if (markers.length > 0 && availableDates.length === 0 && !isRateLimited) {
            // Use the first marker's location to fetch available dates
            const firstMarker = markers[0];
            if (firstMarker) {
                void dispatch(fetchAvailableDates({
                    lat: firstMarker.lat,
                    lng: firstMarker.lng,
                }));
            }
        }
    }, [markers, availableDates, dispatch, isRateLimited]);


    // Manual prediction fetching - only when explicitly called
    const fetchPredictionsForMarkers = useCallback(() => {
        if (markers.length > 0 && availableDates.length > 0 && !isRateLimited) {
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
        const today = new Date();

        return availableDates.map((dateString, index) => {
            const date = new Date(dateString);
            const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
            const monthDay = date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
            });

            // Check if this is today
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
        fetchPredictionsForMarkers,
        updateSelectedDay,
        clearMapData,
        clearRateLimit: clearRateLimitHandler,
    };
}; 