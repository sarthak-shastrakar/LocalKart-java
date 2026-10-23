import { createSlice } from '@reduxjs/toolkit';

/** Load only non-sensitive user info from localStorage for fast first paint.
 *  Token is NEVER stored in localStorage. Remove any stale keys left by older builds. */
const loadFromStorage = () => {
  try {
    // Clean up any stale token keys from previous builds
    localStorage.removeItem('lk_token');
    localStorage.removeItem('accessToken');
    const user = JSON.parse(localStorage.getItem('lk_user') || 'null');
    // loading=false: public pages render immediately.
    // sessionRestoring=true: ProtectedRoute waits for the background refresh.
    return { token: null, user, loading: false, sessionRestoring: true };
  } catch {
    return { token: null, user: null, loading: false, sessionRestoring: true };
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState: loadFromStorage(),
  reducers: {
    /** Called after login / register / refresh: stores token in Redux memory only. */
    setCredentials(state, action) {
      const { accessToken, userId, name, email, role, profileImageUrl } = action.payload;
      state.token = accessToken;
      state.user = { id: userId, name, email, role, profileImageUrl: profileImageUrl ?? null };
      state.loading = false;
      state.sessionRestoring = false;
      try {
        // Store only non-sensitive user info for fast first-paint
        localStorage.setItem('lk_user', JSON.stringify(state.user));
      } catch {}
    },
    /** Update user profile (e.g. after GET /users/me). */
    setUser(state, action) {
      state.user = action.payload;
      state.loading = false;
      state.sessionRestoring = false;
      try {
        localStorage.setItem('lk_user', JSON.stringify(action.payload));
      } catch {}
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
    /** Mark the background session restore as finished (success or definitive failure). */
    setSessionRestoring(state, action) {
      state.sessionRestoring = action.payload;
    },
    /** Store new access token in Redux memory only (silent refresh). */
    setToken(state, action) {
      state.token = action.payload;
    },
    clearAuth(state) {
      state.token = null;
      state.user = null;
      state.loading = false;
      state.sessionRestoring = false;
      try {
        localStorage.removeItem('lk_user');
      } catch {}
    },
  },
});

export const {
  setCredentials,
  setUser,
  setLoading,
  setSessionRestoring,
  setToken,
  clearAuth,
} = authSlice.actions;
export default authSlice.reducer;
