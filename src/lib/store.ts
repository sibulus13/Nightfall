import { configureStore } from '@reduxjs/toolkit'
import predictionReducer from './prediction/predictionSlice'
import mapReducer from './map/mapSlice'

export const makeStore = () => {
  return configureStore({
    reducer: {
      prediction: predictionReducer,
      map: mapReducer,
    }
  })
}

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']