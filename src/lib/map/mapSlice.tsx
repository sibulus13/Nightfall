import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { type Prediction } from "../sunset/type";
import { getSunsetPrediction } from "../sunset/sunset";

interface MapMarker {
  lat: number;
  lng: number;
  id: string;
}

// Cache for API responses to prevent duplicate calls
type ApiCache = Record<
  string,
  {
    data: Prediction[];
    timestamp: number;
    expiresAt: number;
  }
>;

const apiCache: ApiCache = {};
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Helper function to create cache key
const createCacheKey = (lat: number, lng: number) =>
  `${lat.toFixed(4)}_${lng.toFixed(4)}`;

// Helper function to check if cache is valid
const isCacheValid = (cacheKey: string): boolean => {
  const cached = apiCache[cacheKey];
  return !!(cached && Date.now() < cached.expiresAt);
};

interface MapState {
  markers: MapMarker[];
  predictions: Record<string, Prediction | null>;
  loadingStates: Record<string, boolean>;
  isCalculating: boolean;
  availableDates: string[];
  selectedDayIndex: number;
  currentLocation: { lat: number; lng: number } | null;
  isRateLimited: boolean;
  rateLimitMessage: string;
  // Add cache tracking - use array instead of Set for serialization
  cachedLocations: string[];
}

const initialState: MapState = {
  markers: [],
  predictions: {},
  loadingStates: {},
  isCalculating: false,
  availableDates: [],
  selectedDayIndex: 0,
  currentLocation: null,
  isRateLimited: false,
  rateLimitMessage: "",
  cachedLocations: [],
};

// Async thunk to fetch predictions for a marker with caching
export const fetchMarkerPrediction = createAsyncThunk(
  "map/fetchMarkerPrediction",
  async ({
    markerId,
    lat,
    lng,
    dayIndex,
  }: {
    markerId: string;
    lat: number;
    lng: number;
    dayIndex: number;
  }) => {
    const cacheKey = createCacheKey(lat, lng);

    // Check if we have valid cached data
    if (isCacheValid(cacheKey)) {
      const cachedData = apiCache[cacheKey]?.data;
      if (cachedData) {
        return {
          markerId,
          prediction: cachedData[dayIndex] ?? null,
          fromCache: true,
        };
      }
    }

    // Fetch new data if not cached
    const predictionResults = await getSunsetPrediction(lat, lng);

    // Cache the results
    apiCache[cacheKey] = {
      data: predictionResults,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION,
    };

    return {
      markerId,
      prediction: predictionResults[dayIndex] ?? null,
      fromCache: false,
    };
  },
);

// Async thunk to fetch available dates with caching
export const fetchAvailableDates = createAsyncThunk(
  "map/fetchAvailableDates",
  async ({ lat, lng }: { lat: number; lng: number }) => {
    const cacheKey = createCacheKey(lat, lng);

    // If we have cached data, extract dates from it
    if (isCacheValid(cacheKey)) {
      const cachedData = apiCache[cacheKey]?.data;
      if (cachedData) {
        // Extract dates from the cached predictions
        const dates = cachedData
          .map((pred) => {
            const date = new Date(pred.sunset_time + "Z");
            return date.toISOString().split("T")[0];
          })
          .filter((date): date is string => date !== undefined);
        return dates;
      }
    }

    // Fetch new data if not cached
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=weather_code,relative_humidity_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility&daily=sunrise,sunset,daylight_duration,sunshine_duration`;
    const res = await fetch(url);

    // Check for rate limit error
    if (res.status === 429) {
      throw new Error("429 Too Many Requests");
    }

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const forecast = (await res.json()) as { daily?: { time?: string[] } };
    return forecast.daily?.time ?? [];
  },
);

// Batch fetch predictions for multiple markers
export const fetchBatchPredictions = createAsyncThunk(
  "map/fetchBatchPredictions",
  async ({ markers, dayIndex }: { markers: MapMarker[]; dayIndex: number }) => {
    const results = await Promise.allSettled(
      markers.map(async (marker) => {
        const cacheKey = createCacheKey(marker.lat, marker.lng);

        // Check cache first
        if (isCacheValid(cacheKey)) {
          const cachedData = apiCache[cacheKey]?.data;
          if (cachedData) {
            return {
              markerId: marker.id,
              prediction: cachedData[dayIndex] ?? null,
              fromCache: true,
            };
          }
        }

        // Fetch new data
        const predictionResults = await getSunsetPrediction(
          marker.lat,
          marker.lng,
        );

        // Cache the results
        if (predictionResults) {
          apiCache[cacheKey] = {
            data: predictionResults,
            timestamp: Date.now(),
            expiresAt: Date.now() + CACHE_DURATION,
          };
        }

        return {
          markerId: marker.id,
          prediction: predictionResults?.[dayIndex] ?? null,
          fromCache: false,
        };
      }),
    );

    return results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        return {
          markerId: markers[index]?.id ?? "",
          prediction: null,
          fromCache: false,
          error: result.reason as string,
        };
      }
    });
  },
);

export const mapSlice = createSlice({
  name: "map",
  initialState,
  reducers: {
    setMarkers: (state, action: { payload: MapMarker[] }) => {
      state.markers = action.payload;
      // Clear predictions and loading states when markers change to force recalculation
      state.predictions = {};
      state.loadingStates = {};
      state.isCalculating = false;
    },
    setSelectedDayIndex: (state, action: { payload: number }) => {
      state.selectedDayIndex = action.payload;
    },
    setCurrentLocation: (
      state,
      action: { payload: { lat: number; lng: number } },
    ) => {
      state.currentLocation = action.payload;
    },
    resetMap: (state) => {
      state.markers = [];
      state.predictions = {};
      state.loadingStates = {};
      state.isCalculating = false;
      state.availableDates = [];
      state.selectedDayIndex = 0;
      state.currentLocation = null;
      state.isRateLimited = false;
      state.rateLimitMessage = "";
      state.cachedLocations = [];
    },
    clearRateLimit: (state) => {
      state.isRateLimited = false;
      state.rateLimitMessage = "";
    },
    // Add cache management actions
    clearCache: (state) => {
      Object.keys(apiCache).forEach((key) => delete apiCache[key]);
      state.cachedLocations = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchMarkerPrediction
      .addCase(fetchMarkerPrediction.pending, (state, action) => {
        const { markerId } = action.meta.arg;
        state.loadingStates[markerId] = true;
        state.isCalculating = true;
      })
      .addCase(fetchMarkerPrediction.fulfilled, (state, action) => {
        const { markerId, prediction, fromCache } = action.payload;
        state.predictions[markerId] = prediction;
        state.loadingStates[markerId] = false;

        // Track cached locations
        if (fromCache) {
          const { lat, lng } = action.meta.arg;
          const cacheKey = createCacheKey(lat, lng);
          if (!state.cachedLocations.includes(cacheKey)) {
            state.cachedLocations.push(cacheKey);
          }
        }

        // Check if all markers are done loading
        const allMarkersLoaded = state.markers.every(
          (marker) => !state.loadingStates[marker.id],
        );
        if (allMarkersLoaded) {
          state.isCalculating = false;
        }
      })
      .addCase(fetchMarkerPrediction.rejected, (state, action) => {
        const { markerId } = action.meta.arg;
        state.predictions[markerId] = null;
        state.loadingStates[markerId] = false;

        // Check if it's a rate limit error
        if (action.error.message?.includes("429")) {
          state.isRateLimited = true;
          state.rateLimitMessage =
            "Too many requests! Please wait a moment before trying again.";
        }

        // Check if all markers are done loading
        const allMarkersLoaded = state.markers.every(
          (marker) => !state.loadingStates[marker.id],
        );
        if (allMarkersLoaded) {
          state.isCalculating = false;
        }
      })
      // Handle batch predictions
      .addCase(fetchBatchPredictions.pending, (state) => {
        state.isCalculating = true;
      })
      .addCase(fetchBatchPredictions.fulfilled, (state, action) => {
        action.payload.forEach((result) => {
          if (result.prediction !== undefined) {
            state.predictions[result.markerId] = result.prediction;
            state.loadingStates[result.markerId] = false;

            if (result.fromCache) {
              if (!state.cachedLocations.includes(result.markerId)) {
                state.cachedLocations.push(result.markerId);
              }
            }
          }
        });
        state.isCalculating = false;
      })
      .addCase(fetchBatchPredictions.rejected, (state, action) => {
        state.isCalculating = false;
        if (action.error.message?.includes("429")) {
          state.isRateLimited = true;
          state.rateLimitMessage =
            "Too many requests! Please wait a moment before trying again.";
        }
      })
      // Handle fetchAvailableDates
      .addCase(fetchAvailableDates.fulfilled, (state, action) => {
        state.availableDates = action.payload;
        // Clear rate limit when successful
        state.isRateLimited = false;
        state.rateLimitMessage = "";
      })
      .addCase(fetchAvailableDates.rejected, (state, action) => {
        // Check if it's a rate limit error
        if (action.error.message?.includes("429")) {
          state.isRateLimited = true;
          state.rateLimitMessage =
            "Too many requests! Please wait a moment before trying again.";
        }
      });
  },
});

export const {
  setMarkers,
  setSelectedDayIndex,
  setCurrentLocation,
  resetMap,
  clearRateLimit,
  clearCache,
} = mapSlice.actions;

export default mapSlice.reducer;
