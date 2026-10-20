import { createSlice } from '@reduxjs/toolkit';

const loadFromStorage = () => {
  try {
    const token = localStorage.getItem('lk_token');
    const user = JSON.parse(localStorage.getItem('lk_user') || 'null');
    // If token exists, start with loading=true so the session-restore spinner shows immediately
    return { token, user, loading: !!token };
  } catch {
    return { token: null, user: null, loading: false };
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState: { ...loadFromStorage(), loading: false },
  reducers: {
    setCredentials(state, action) {
      const { accessToken, userId, name, email, role, profileImageUrl } = action.payload;
      state.token = accessToken;
      state.user = { id: userId, name, email, role, profileImageUrl: profileImageUrl || null };
      state.loading = false;
      try {
        localStorage.setItem('lk_token', accessToken);
        localStorage.setItem('lk_user', JSON.stringify(state.user));
      } catch {}
    },
    setUser(state, action) {
      state.user = action.payload;
      state.loading = false;
      try {
        localStorage.setItem('lk_user', JSON.stringify(action.payload));
      } catch {}
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
    clearAuth(state) {
      state.token = null;
      state.user = null;
      state.loading = false;
      try {
        localStorage.removeItem('lk_token');
        localStorage.removeItem('lk_user');
      } catch {}
    },
  },
});

export const { setCredentials, setUser, setLoading, clearAuth } = authSlice.actions;
export default authSlice.reducer;
