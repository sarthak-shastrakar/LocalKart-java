import { createBrowserRouter } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import CustomerLayout from '../layouts/CustomerLayout';
import OwnerLayout from '../layouts/OwnerLayout';
import AdminLayout from '../layouts/AdminLayout';

import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import StoreDetailPage from '../pages/StoreDetailPage';
import OwnerDashboardPage from '../pages/OwnerDashboardPage';
import OwnerStoreEditPage from '../pages/OwnerStoreEditPage';
import OwnerProductsPage from '../pages/OwnerProductsPage';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import AdminUsersPage from '../pages/AdminUsersPage';
import AdminAppealsPage from '../pages/AdminAppealsPage';
import ProfilePage from '../pages/ProfilePage';
import AppealPage from '../pages/AppealPage';
import CartPage from '../pages/CartPage';

export const router = createBrowserRouter([
  // Public auth & appeal pages (no layout)
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/appeal', element: <AppealPage /> },

  // Customer / public routes & Profile
  {
    element: <CustomerLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/stores/:storeId', element: <StoreDetailPage /> },
      {
        path: '/cart',
        element: (
          <ProtectedRoute allowedRoles={['CUSTOMER']}>
            <CartPage />
          </ProtectedRoute>
        ),
      },
      {
        // TODO: Checkout page when checkout backend is built
        path: '/checkout',
        element: (
          <ProtectedRoute allowedRoles={['CUSTOMER']}>
            <CartPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/profile',
        element: (
          <ProtectedRoute allowedRoles={['CUSTOMER', 'STORE_OWNER', 'ADMIN']}>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
    ],
  },

  // Store Owner routes
  {
    element: (
      <ProtectedRoute allowedRoles={['STORE_OWNER']}>
        <OwnerLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/owner', element: <OwnerDashboardPage /> },
      { path: '/owner/store/edit', element: <OwnerStoreEditPage /> },
      { path: '/owner/products', element: <OwnerProductsPage /> },
    ],
  },

  // Admin routes
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'appeals', element: <AdminAppealsPage /> },
    ],
  },
]);
