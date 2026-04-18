import { configureStore } from '@reduxjs/toolkit';
import interactionsReducer from './interactionsSlice';

export const store = configureStore({
  reducer: {
    interactions: interactionsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['interactions/aiProcess/fulfilled'],
      },
    }),
});

export default store;
