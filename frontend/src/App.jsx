import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './app/store';
import { router } from './app/routes';
import { setCredentials, setUser, setLoading, clearAuth } from './features/auth/authSlice';
import { fetchCart, resetCart } from './features/cart/cartSlice';
import { refreshApi, getMeApi } from './features/auth/authApi';
import { FullPageSpinner } from './components/Spinner';

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
  const { loading, user } = useSelector((s) => s.auth);

  // ── 1. App start: silent refresh ─────────────────────────────────────────
  useEffect(() => {
    getInitPromise().then(async (res) => {
      // 204 = no cookie / not logged in → treat as logged out silently
      if (!res || res.status === 204 || res.status === 401 || res.status === 403) {
        dispatch(setLoading(false));
        return;
      }

      // 200 → store access token and fetch full user profile
      if (res.status === 200 && res.data?.accessToken) {
        try {
          dispatch(setCredentials(res.data));
          const meRes = await getMeApi();
          dispatch(setUser(meRes.data));
        } catch {
          dispatch(clearAuth());
          dispatch(resetCart());
        }
      }

      dispatch(setLoading(false));
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

  if (loading) return <FullPageSpinner />;
  return children;
}

export default function App() {
  return (
    <Provider store={store}>
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

