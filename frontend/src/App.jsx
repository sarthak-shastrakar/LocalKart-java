import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './app/store';
import { router } from './app/routes';
import {
  setCredentials,
  setUser,
  setSessionRestoring,
  clearAuth,
} from './features/auth/authSlice';
import { fetchCart, resetCart } from './features/cart/cartSlice';
import { refreshApi, getMeApi } from './features/auth/authApi';
import SlowRequestBanner from './components/SlowRequestBanner';

// ─── Module-level guard: run the refresh call exactly once (StrictMode safe) ──
let _initPromise = null;

function getInitPromise() {
  if (!_initPromise) {
    _initPromise = refreshApi()
      .then((res) => res)
      .catch((err) => err?.response ?? null);
  }
  return _initPromise;
}

// ─── BroadcastChannel for multi-tab sync ─────────────────────────────────────
const authChannel = new BroadcastChannel('auth');

function AppInit({ children }) {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);

  // ── 1. App start: silent refresh runs in the background ──────────────────
  //    Public pages render immediately — only ProtectedRoute waits.
  //    Network/timeout errors do NOT clear locally stored user info;
  //    we keep `sessionRestoring=true` so ProtectedRoute can retry-gate.
  useEffect(() => {
    getInitPromise().then(async (res) => {
      // null  → network/timeout error: do NOT clear auth, just mark done
      if (!res) {
        dispatch(setSessionRestoring(false));
        return;
      }

      // 204 / 401 / 403 → no valid session
      if (res.status === 204 || res.status === 401 || res.status === 403) {
        // Definitive "not logged in" — safe to clear stale user from storage
        dispatch(clearAuth());
        dispatch(resetCart());
        dispatch(setSessionRestoring(false));
        return;
      }

      // 200 → store access token and fetch full user profile
      if (res.status === 200 && res.data?.accessToken) {
        try {
          dispatch(setCredentials(res.data));   // also sets sessionRestoring=false
          const meRes = await getMeApi();
          dispatch(setUser(meRes.data));         // also sets sessionRestoring=false
        } catch {
          dispatch(clearAuth());
          dispatch(resetCart());
          dispatch(setSessionRestoring(false));
        }
      } else {
        dispatch(setSessionRestoring(false));
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 2. Fetch cart when the user becomes a CUSTOMER ──────────────────────
  useEffect(() => {
    if (user?.role === 'CUSTOMER') {
      dispatch(fetchCart());
    } else {
      dispatch(resetCart());
    }
  }, [user?.role, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 3. Listen for cross-tab logout ──────────────────────────────────────
  useEffect(() => {
    const handleAuthMessage = (event) => {
      if (event.data === 'logout') {
        // Do NOT call logout API — other tab already did it
        dispatch(clearAuth());
        dispatch(resetCart());
        window.location.href = '/';
      }
    };
    authChannel.addEventListener('message', handleAuthMessage);
    return () => authChannel.removeEventListener('message', handleAuthMessage);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Render children immediately — no full-page spinner here
  return children;
}

export default function App() {
  return (
    <Provider store={store}>
      {/* Non-blocking banner shown when any request stalls > 4 s */}
      <SlowRequestBanner />

      <AppInit>
        <RouterProvider router={router} />
      </AppInit>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { borderRadius: '12px', fontSize: '14px' },
        }}
      />
    </Provider>
  );
}
