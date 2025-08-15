import { createSlice } from "@reduxjs/toolkit";
import { type Prediction } from "../sunset/type";

const dummyPredictionInstance: Prediction = {
  score: 0,
  golden_hour: {
    start: "",
    end: "",
  },
  weather_code: -1,
  sunset_time: "",
  scores: {
    score: 0,
    cloudCoverage: 0,
    visibility: 0,
    humidity: 0,
    pressure: 0,
    particulate: 0,
  },
  cloud_cover: 0,
  cloud_cover_low: 0,
  cloud_cover_mid: 0,
  cloud_cover_high: 0,
  visibility: 0,
  humidity: 0,
  surface_pressure: 1013.25,
  // Air quality data
  pm10: 0,
  pm2_5: 0,
  european_aqi: 0,
};

const initialPrediction = Array(6).fill(dummyPredictionInstance);

export const predictionSlice = createSlice({
  name: "prediction",
  initialState: {
    prediction: initialPrediction,
  },
  reducers: {
    setPrediction: (state, action: { payload: Prediction[] }) => {
      state.prediction = action.payload;
    },
    resetPrediction: (state) => {
      state.prediction = initialPrediction;
    },
  },
});

export const { setPrediction, resetPrediction } = predictionSlice.actions;
export default predictionSlice.reducer;
