import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './app/store';
import { router } from './app/routes';
import { setUser, setLoading, clearAuth } from './features/auth/authSlice';
import { fetchCart, resetCart } from './features/cart/cartSlice';
import { getMeApi } from './features/auth/authApi';
import { FullPageSpinner } from './components/Spinner';

function AppInit({ children }) {
  const dispatch = useDispatch();
  const { token, user, loading } = useSelector((s) => s.auth);

  useEffect(() => {
    if (!token) return;
    getMeApi()
      .then((res) => dispatch(setUser(res.data)))
      .catch(() => {
        dispatch(clearAuth());
        dispatch(resetCart());
      })
      .finally(() => dispatch(setLoading(false)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user?.role === 'CUSTOMER') {
      dispatch(fetchCart());
    } else {
      dispatch(resetCart());
    }
  }, [user?.role, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
