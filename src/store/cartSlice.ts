import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
  id: string;
  productId: number;
  name: string;
  nameAr: string;
  price: number;
  quantity: number;
  modifiers: Record<string, string>;
}

interface CartState {
  items: CartItem[];
  taxRate: number;
}

const initialState: CartState = {
  items: [],
  taxRate: 0.15, // 15% VAT
};

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<CartItem>) => {
      state.items.push(action.payload);
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.id !== action.payload);
    },
    clearCart: (state) => {
      state.items = [];
    }
  },
});

export const { addItem, removeItem, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
