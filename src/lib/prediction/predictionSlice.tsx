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
