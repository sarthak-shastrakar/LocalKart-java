import axios from 'axios';
import { store } from '../app/store';
import { clearAuth, setToken } from '../features/auth/authSlice';
import { resetCart } from '../features/cart/cartSlice';
import toast from 'react-hot-toast';
import { startSlowTimer } from '../components/SlowRequestBanner';

// ─── URLs that must NEVER trigger the 401 silent-refresh logic ────────────────
const NO_REFRESH_URLS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
];
const isNoRefreshUrl = (url = '') =>
  NO_REFRESH_URLS.some((u) => url.includes(u)) || url.includes('/auth/appeals');

// ─── Retryable status codes (GET only) ───────────────────────────────────────
const RETRY_STATUSES = new Set([502, 503, 504]);
const MAX_RETRIES    = 2;
const RETRY_DELAY_MS = 3000;

function isRetryableError(error) {
  if (!error.config || error.config.method?.toUpperCase() !== 'GET') return false;
  if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') return true;
  if (error.response && RETRY_STATUSES.has(error.response.status)) return true;
  return false;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Single-flight refresh state ─────────────────────────────────────────────
let _refreshPromise = null;

/**
 * Execute one POST /auth/refresh at a time.
 * All concurrent callers share the same promise.
 */
function doRefresh() {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = api
    .post('/auth/refresh')
    .then((res) => {
      store.dispatch(setToken(res.data.accessToken));
      return res.data.accessToken;
    })
    .catch((err) => {
      // Surface the error so callers can decide what to do
      throw err;
    })
    .finally(() => {
      _refreshPromise = null;
    });

  return _refreshPromise;
}

/** Clear Redux state, localStorage user info, then redirect to /login with a toast. */
function forceLogout(message) {
  store.dispatch(clearAuth());
  store.dispatch(resetCart());
  toast.error(message);
  window.location.href = '/login';
}

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,     // send the httpOnly refresh_token cookie on every request to OUR backend
  timeout: 90_000,           // 90 s — free-tier host can take up to 90 s to wake
});

// ── Request interceptor: attach in-memory Bearer token + start slow timer ─────
api.interceptors.request.use((config) => {
  const token = store.getState().auth.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Attach a slow-request cancel handle so the response interceptor can stop it
  config._cancelSlowTimer = startSlowTimer();

  return config;
});

// ── Response interceptor: silent refresh on 401, GET retry, slow timer ────────
api.interceptors.response.use(
  (res) => {
    // Cancel the slow-request timer on success
    res.config._cancelSlowTimer?.();
    return res;
  },
  async (error) => {
    const originalConfig = error.config ?? {};
    const status         = error.response?.status;
    const url            = originalConfig.url || '';

    // ── GET retry on network error / 502 / 503 / 504 ─────────────────────────
    if (isRetryableError(error)) {
      originalConfig._retryCount = (originalConfig._retryCount ?? 0) + 1;

      if (originalConfig._retryCount <= MAX_RETRIES) {
        // Cancel current slow timer; the retry will start a new one
        originalConfig._cancelSlowTimer?.();
        await delay(RETRY_DELAY_MS);
        return api(originalConfig);
      }
    }

    // Cancel the slow-request timer on final failure
    originalConfig._cancelSlowTimer?.();

    // ── 401 silent-refresh ────────────────────────────────────────────────────
    if (status === 401 && !isNoRefreshUrl(url) && !originalConfig._retry) {
      originalConfig._retry = true; // mark so we never retry twice

      try {
        await doRefresh();
        // Retry the original request with the new token
        const newToken = store.getState().auth.token;
        originalConfig.headers = originalConfig.headers ?? {};
        originalConfig.headers.Authorization = `Bearer ${newToken}`;
        return api(originalConfig);
      } catch (refreshErr) {
        const refreshStatus = refreshErr.response?.status;
        if (refreshStatus === 403) {
          const msg =
            refreshErr.response?.data?.message ||
            'Your account has been blocked. Please contact support.';
          forceLogout(msg);
        } else {
          // 401 from refresh = session truly expired
          forceLogout('Your session expired. Please log in again.');
        }
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
