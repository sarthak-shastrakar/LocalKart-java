import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

const roleHome = {
  CUSTOMER: '/',
  STORE_OWNER: '/owner',
  ADMIN: '/admin',
};

export default function ProtectedRoute({ children, allowedRoles }) {
  const { token, user } = useSelector((s) => s.auth);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to={roleHome[user?.role] || '/'} replace />;
  }

  return children;
}
