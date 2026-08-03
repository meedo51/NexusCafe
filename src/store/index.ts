import { configureStore } from '@reduxjs/toolkit';
import cartReducer from './cartSlice';
import authReducer from './authSlice';
import employeesReducer from '../features/employees/store/employeesSlice';

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    auth: authReducer,
    employees: employeesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
