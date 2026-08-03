import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ShiftState {
  id: number;
  status: 'ACTIVE' | 'CLOSED' | 'ON_BREAK';
  openingBalance: number;
  clockInTime: string;
}

interface AuthState {
  token: string | null;
  user: {
    id?: number;
    uid: string;
    email: string;
    name: string;
    role: string;
  } | null;
  shift: ShiftState | null;
}

const initialState: AuthState = {
  token: null,
  user: null,
  shift: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: AuthState['user']; token: string; shift?: ShiftState | null }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      if (action.payload.shift !== undefined) {
        state.shift = action.payload.shift;
      }
    },
    setShift: (state, action: PayloadAction<ShiftState | null>) => {
      state.shift = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.shift = null;
    },
  },
});

export const { setCredentials, setShift, logout } = authSlice.actions;
export default authSlice.reducer;
