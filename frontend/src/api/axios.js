import axios from 'axios';
import { store } from '../app/store';
import { clearAuth } from '../features/auth/authSlice';
import { resetCart } from '../features/cart/cartSlice';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const isAuthRequest = config.url?.includes('/auth/');
  const token = store.getState().auth.token;
  if (token && !isAuthRequest) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || '';
    const isAuthRequest = url.includes('/auth/');

    if (error.response?.status === 401 && !isAuthRequest) {
      store.dispatch(clearAuth());
      store.dispatch(resetCart());
      toast.error('Your session ended. Please log in again. If your account was blocked you will see a message at login.');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
