import { createSlice } from "@reduxjs/toolkit";
import { type Prediction } from "../sunset/type";
export const predictionSlice = createSlice({
  name: "prediction",
  initialState: {
    prediction: [] as Prediction[],
  },
  reducers: {
    setPrediction: (state, action: { payload: Prediction[] }) => {
      state.prediction = action.payload;
    },
    resetPrediction: (state) => {
      state.prediction = [] as Prediction[];
    },
  },
});

export const { setPrediction, resetPrediction } = predictionSlice.actions;
export default predictionSlice.reducer;
