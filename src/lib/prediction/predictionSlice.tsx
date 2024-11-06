import { createSlice } from "@reduxjs/toolkit";

export const predictionSlice = createSlice({
  name: "prediction",
  initialState: {
    prediction: [],
  },
  reducers: {
    setPrediction: (state, action) => {
      state.prediction = action.payload;
    },

    resetPrediction: (state) => {
      state.prediction = [];
    },
  },
});

export const { setPrediction, resetPrediction } = predictionSlice.actions;
export default predictionSlice.reducer;
