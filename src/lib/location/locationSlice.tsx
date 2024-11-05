import { createSlice } from "@reduxjs/toolkit";

export const locationSlice = createSlice({
  name: "location",
  initialState: {
    name: "",
    location: {
      lat: null,
      lon: null,
    },
  },
  reducers: {
    setLocation: (state, action) => {
      state.name = action.payload.name || "";
      state.location.lat = action.payload.lat;
      state.location.lon = action.payload.lon;
    },

    resetLocation: (state) => {
      state.name = "";
      state.location.lat = null;
      state.location.lon = null;
    },
  },
});

export const { setLocation, resetLocation } = locationSlice.actions;
export default locationSlice.reducer;
