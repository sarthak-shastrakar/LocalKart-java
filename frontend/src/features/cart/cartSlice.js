import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as cartApi from './cartApi';

export const emptyCart = {
  storeId: null,
  storeName: null,
  storeOpen: false,
  items: [],
  totalItems: 0,
  subtotal: 0,
  hasUnavailableItems: false,
};

export const fetchCart = createAsyncThunk('cart/fetchCart', async (_, { rejectWithValue }) => {
  try {
    const res = await cartApi.getCart();
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message || 'Failed to load cart');
  }
});

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    data: emptyCart,
    loading: false,
    error: null,
    replaceModal: {
      isOpen: false,
      pendingItem: null,
      currentStoreName: '',
    },
  },
  reducers: {
    setCartData(state, action) {
      state.data = action.payload ?? emptyCart;
      state.error = null;
    },
    resetCart(state) {
      state.data = emptyCart;
      state.loading = false;
      state.error = null;
      state.replaceModal = {
        isOpen: false,
        pendingItem: null,
        currentStoreName: '',
      };
    },
    openReplaceModal(state, action) {
      state.replaceModal = {
        isOpen: true,
        pendingItem: action.payload.pendingItem,
        currentStoreName: action.payload.currentStoreName || state.data?.storeName || 'another store',
      };
    },
    closeReplaceModal(state) {
      state.replaceModal = {
        isOpen: false,
        pendingItem: null,
        currentStoreName: '',
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload ?? emptyCart;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load cart';
      });
  },
});

export const { setCartData, resetCart, openReplaceModal, closeReplaceModal } = cartSlice.actions;
export default cartSlice.reducer;
