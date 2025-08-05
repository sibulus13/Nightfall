import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { type Prediction } from "../sunset/type";
import { getSunsetPrediction } from "../sunset/sunset";

interface MapMarker {
  lat: number;
  lng: number;
  id: string;
}

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
};

// Async thunk to fetch predictions for a marker
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
    const predictionResults = await getSunsetPrediction(lat, lng);
    return {
      markerId,
      prediction: predictionResults[dayIndex] ?? null,
    };
  },
);

// Async thunk to fetch available dates
export const fetchAvailableDates = createAsyncThunk(
  "map/fetchAvailableDates",
  async ({ lat, lng }: { lat: number; lng: number }) => {
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

export const mapSlice = createSlice({
  name: "map",
  initialState,
  reducers: {
    setMarkers: (state, action: { payload: MapMarker[] }) => {
      state.markers = action.payload;
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
    },
    clearRateLimit: (state) => {
      state.isRateLimited = false;
      state.rateLimitMessage = "";
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
        const { markerId, prediction } = action.payload;
        state.predictions[markerId] = prediction;
        state.loadingStates[markerId] = false;
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
} = mapSlice.actions;

export default mapSlice.reducer;
