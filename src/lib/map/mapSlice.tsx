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

// Helper functions for localStorage
const saveToLocalStorage = (key: string, data: unknown) => {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, JSON.stringify(data));
    }
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
};

const loadFromLocalStorage = (key: string): unknown => {
  try {
    if (typeof window !== "undefined") {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    }
  } catch (error) {
    console.error("Error loading from localStorage:", error);
  }
  return null;
};

// Default initial state (used for SSR)
const getDefaultInitialState = (): MapState => ({
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
});

// Load initial state from localStorage (client-side only)
const loadInitialState = (): MapState => {
  // During SSR, return default state to prevent hydration mismatch
  if (typeof window === "undefined") {
    return getDefaultInitialState();
  }

  const savedMarkers =
    (loadFromLocalStorage("sunset-app-markers") as MapMarker[]) || [];
  const savedLocation = loadFromLocalStorage("sunset-app-last-location") as {
    lat: number;
    lng: number;
  } | null;
  const savedPredictions =
    (loadFromLocalStorage("sunset-app-predictions") as Record<
      string,
      Prediction | null
    >) || {};

  return {
    markers: savedMarkers,
    predictions: savedPredictions,
    loadingStates: {},
    isCalculating: false,
    availableDates: [],
    selectedDayIndex: 0,
    currentLocation: savedLocation,
    isRateLimited: false,
    rateLimitMessage: "",
    cachedLocations: [],
  };
};

const initialState: MapState = loadInitialState();

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
            const date = new Date(pred.sunset_time); // Use timezone-aware date
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
    const dates = forecast.daily?.time ?? [];

    return dates;
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
        try {
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
        } catch (error) {
          console.error(
            `❌ Error fetching prediction for marker ${marker.id}:`,
            error,
          );
          throw error;
        }
      }),
    );

    return results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        console.error(
          `❌ Marker ${index + 1} prediction rejected:`,
          result.reason,
        );
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
      // Clear predictions and loading states when markers change
      state.predictions = {};
      state.loadingStates = {};
      state.isCalculating = false;
    },
    addMarker: (state, action: { payload: { lat: number; lng: number } }) => {
      // Only add if we have less than 5 markers
      if (state.markers.length < 5) {
        const newMarker: MapMarker = {
          lat: action.payload.lat,
          lng: action.payload.lng,
          id: `marker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
        state.markers.push(newMarker);

        // Save to localStorage
        saveToLocalStorage("sunset-app-markers", state.markers);
      }
    },
    removeMarker: (state, action: { payload: string }) => {
      const markerId = action.payload;
      state.markers = state.markers.filter((marker) => marker.id !== markerId);
      // Clean up associated data
      delete state.predictions[markerId];
      delete state.loadingStates[markerId];

      // Save to localStorage
      saveToLocalStorage("sunset-app-markers", state.markers);
      saveToLocalStorage("sunset-app-predictions", state.predictions);
    },
    clearAllMarkers: (state) => {
      state.markers = [];
      state.predictions = {};
      state.loadingStates = {};
      state.isCalculating = false;

      // Clear from localStorage
      saveToLocalStorage("sunset-app-markers", []);
      saveToLocalStorage("sunset-app-predictions", {});
    },
    setSelectedDayIndex: (state, action: { payload: number }) => {
      state.selectedDayIndex = action.payload;
    },
    setCurrentLocation: (
      state,
      action: { payload: { lat: number; lng: number } },
    ) => {
      state.currentLocation = action.payload;

      // Save to localStorage
      saveToLocalStorage("sunset-app-last-location", action.payload);
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
    // Hydrate state from localStorage after client-side mount
    hydrateFromLocalStorage: (state) => {
      if (typeof window !== "undefined") {
        const savedMarkers =
          (loadFromLocalStorage("sunset-app-markers") as MapMarker[]) || [];
        const savedLocation = loadFromLocalStorage(
          "sunset-app-last-location",
        ) as {
          lat: number;
          lng: number;
        } | null;
        const savedPredictions =
          (loadFromLocalStorage("sunset-app-predictions") as Record<
            string,
            Prediction | null
          >) || {};

        state.markers = savedMarkers;
        state.currentLocation = savedLocation;
        state.predictions = savedPredictions;
      }
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
        console.log(
          "⏳ fetchBatchPredictions.pending - Setting isCalculating to true",
        );
        state.isCalculating = true;
      })
      .addCase(fetchBatchPredictions.fulfilled, (state, action) => {
        console.log(
          "🎉 fetchBatchPredictions.fulfilled - Processing results:",
          action.payload,
        );
        action.payload.forEach((result) => {
          if (result.prediction !== undefined && "markerId" in result) {
            console.log(
              `📊 Setting prediction for marker ${result.markerId}:`,
              result.prediction,
            );
            state.predictions[result.markerId] = result.prediction;
            state.loadingStates[result.markerId] = false;

            if (result.fromCache) {
              if (!state.cachedLocations.includes(result.markerId)) {
                state.cachedLocations.push(result.markerId);
              }
            }
          } else {
            console.log(`⚠️ No prediction data for marker`, result);
          }
        });
        state.isCalculating = false;

        // Save predictions to localStorage
        saveToLocalStorage("sunset-app-predictions", state.predictions);
      })
      .addCase(fetchBatchPredictions.rejected, (state, action) => {
        console.error("❌ fetchBatchPredictions.rejected:", action.error);
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
  addMarker,
  removeMarker,
  clearAllMarkers,
  setSelectedDayIndex,
  setCurrentLocation,
  resetMap,
  clearRateLimit,
  clearCache,
  hydrateFromLocalStorage,
} = mapSlice.actions;

export default mapSlice.reducer;
