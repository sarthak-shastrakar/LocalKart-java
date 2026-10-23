import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Spinner from './Spinner';

const roleHome = {
  CUSTOMER: '/',
  STORE_OWNER: '/owner',
  ADMIN: '/admin',
};

/**
 * ProtectedRoute
 * ─────────────
 * • While sessionRestoring is true  → show an inline spinner with explanatory text.
 * • Once restore is done:
 *     – no token  → redirect to /login
 *     – wrong role → redirect to the role's home
 *     – ok        → render children
 *
 * A "Retry" button is shown if the restore finished without a token AND the user
 * had locally cached user info (meaning a network / timeout error, not a true
 * "not logged in" state). This avoids a silent redirect to login on a flaky
 * connection.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { token, user, sessionRestoring } = useSelector((s) => s.auth);
  const location = useLocation();

  // ── Waiting for background session restore ────────────────────────────────
  if (sessionRestoring) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white"
      >
        <Spinner size="lg" />
        <p className="text-sm text-gray-500 font-medium text-center max-w-xs">
          Checking your session&hellip;
          <br />
          <span className="text-xs text-gray-400">
            The server may be waking up. This usually takes under a minute.
          </span>
        </p>
      </div>
    );
  }

  // ── Restore finished without a token ─────────────────────────────────────
  if (!token) {
    // If we still have locally stored user info, a network / timeout error
    // occurred (not a clean logout). Offer a Retry instead of silently logging out.
    if (user) {
      return (
        <div
          role="alert"
          className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white px-4"
        >
          <svg
            aria-hidden="true"
            className="h-12 w-12 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
          <p className="text-sm text-gray-600 text-center max-w-xs">
            Couldn&#39;t reach the server to verify your session.
            <br />
            <span className="text-xs text-gray-400">
              Please check your connection and try again.
            </span>
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white
                       hover:bg-green-700 active:scale-95 transition-all focus-visible:outline
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            Retry
          </button>
        </div>
      );
    }

    // No local user info → genuinely not logged in
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ── Role check ────────────────────────────────────────────────────────────
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to={roleHome[user?.role] || '/'} replace />;
  }

  return children;
}
