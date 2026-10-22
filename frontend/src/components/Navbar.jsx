import { useState, useEffect, useCallback } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearAuth } from '../features/auth/authSlice';
import { resetCart } from '../features/cart/cartSlice';
import { logoutApi } from '../features/auth/authApi';
import { getPendingAppealCounts } from '../features/admin/appealAdminApi';
import { ShoppingBag, ShoppingCart, Menu, X, Store, ShieldCheck, LogOut, User } from 'lucide-react';
import Avatar from './Avatar';
import toast from 'react-hot-toast';

const authChannel = new BroadcastChannel('auth');

const roleLinks = {
  CUSTOMER: [
    { to: '/', label: 'Nearby Stores' },
    { to: '/cart', label: 'Cart' },
  ],
  STORE_OWNER: [
    { to: '/owner', label: 'My Store' },
    { to: '/owner/products', label: 'Products' },
  ],
  ADMIN: [
    { to: '/admin', label: 'Stores' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/appeals', label: 'Appeals', badge: true },
  ],
};

const roleIcon = {
  CUSTOMER: <User size={14} />,
  STORE_OWNER: <Store size={14} />,
  ADMIN: <ShieldCheck size={14} />,
};

export default function Navbar() {
  const { user } = useSelector((s) => s.auth);
  const totalItems = useSelector((s) => s.cart.data?.totalItems ?? 0);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [pendingAppealsCount, setPendingAppealsCount] = useState(0);

  const fetchAppealsCount = useCallback(async () => {
    if (user?.role !== 'ADMIN') return;
    try {
      const res = await getPendingAppealCounts();
      setPendingAppealsCount(res.data?.all ?? 0);
    } catch {
      // non-blocking
    }
  }, [user?.role]);

  useEffect(() => {
    fetchAppealsCount();
    const handleUpdate = () => fetchAppealsCount();
    window.addEventListener('appeal-updated', handleUpdate);
    return () => window.removeEventListener('appeal-updated', handleUpdate);
  }, [fetchAppealsCount]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutApi();
    } catch {
      // Network errors are intentionally ignored — we still clear state
    } finally {
      setLoggingOut(false);
    }
    // Notify other tabs before clearing state so they receive the message
    authChannel.postMessage('logout');
    dispatch(clearAuth());
    dispatch(resetCart());
    navigate('/login');
  };

  const links = user ? (roleLinks[user.role] || []) : [];

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-green-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-green-700">
          <ShoppingBag className="text-green-500" size={26} />
          <span>Local<span className="text-green-500">Kart</span></span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-2">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/admin' || l.to === '/' || l.to === '/owner'}
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-1.5 rounded-xl transition-all ${
                  isActive
                    ? 'text-green-700 bg-green-50 shadow-sm border border-green-200'
                    : 'text-gray-600 hover:text-green-600 hover:bg-gray-50 border border-transparent'
                }`
              }
            >
              <span>{l.label}</span>
              {l.to === '/cart' && totalItems > 0 && (
                <span
                  aria-live="polite"
                  className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-green-600 text-white leading-none"
                >
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
              {l.badge && pendingAppealsCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white leading-none">
                  {pendingAppealsCount}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        {/* Desktop user & Cart */}
        <div className="hidden md:flex items-center gap-3">
          {user?.role === 'CUSTOMER' && (
            <Link
              to="/cart"
              id="navbar-cart-btn"
              aria-label={`Shopping cart with ${totalItems} items`}
              className="relative p-2 text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-xl transition flex items-center justify-center"
            >
              <ShoppingCart size={21} />
              {totalItems > 0 && (
                <span
                  aria-live="polite"
                  className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-green-600 text-white text-xs font-bold leading-none shadow"
                >
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </Link>
          )}

          {user ? (
            <>
              <Link
                to="/profile"
                title="View Profile"
                className="flex items-center gap-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors border border-transparent hover:border-gray-300"
              >
                <Avatar src={user.profileImageUrl} name={user.name} size="sm" />
                <span className="font-semibold">{user.name}</span>
              </Link>
              <button
                id="navbar-logout-btn"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut size={15} />
                {loggingOut ? 'Signing out…' : 'Logout'}
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-700 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile items: Cart icon + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          {user?.role === 'CUSTOMER' && (
            <Link
              to="/cart"
              id="navbar-mobile-cart-btn"
              aria-label={`Shopping cart with ${totalItems} items`}
              className="relative p-2 text-gray-700 hover:text-green-600 rounded-lg transition"
            >
              <ShoppingCart size={22} />
              {totalItems > 0 && (
                <span
                  aria-live="polite"
                  className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-4.5 px-1 rounded-full bg-green-600 text-white text-[11px] font-bold leading-none shadow"
                >
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </Link>
          )}
          <button
            id="navbar-hamburger-btn"
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 pb-4 space-y-2">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/admin' || l.to === '/' || l.to === '/owner'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between py-2 px-3 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'text-green-700 bg-green-50 font-semibold'
                    : 'text-gray-700 hover:text-green-600 hover:bg-gray-50'
                }`
              }
            >
              <span>{l.label}</span>
              {l.to === '/cart' && totalItems > 0 && (
                <span
                  aria-live="polite"
                  className="px-2 py-0.5 text-xs font-bold rounded-full bg-green-600 text-white"
                >
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
              {l.badge && pendingAppealsCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white">
                  {pendingAppealsCount}
                </span>
              )}
            </NavLink>
          ))}
          {user && (
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 py-2 text-sm font-semibold text-gray-800 hover:text-green-600 border-b border-gray-100 pb-2"
            >
              <Avatar src={user.profileImageUrl} name={user.name} size="sm" />
              <span>My Profile ({user.name})</span>
            </Link>
          )}
          {user ? (
            <button
              onClick={() => { setOpen(false); handleLogout(); }}
              disabled={loggingOut}
              className="flex items-center gap-2 py-2 text-sm font-medium text-red-500 disabled:opacity-50"
            >
              <LogOut size={15} /> {loggingOut ? 'Signing out…' : `Logout (${user.name})`}
            </button>
          ) : (
            <Link to="/login" onClick={() => setOpen(false)} className="block py-2 text-sm font-medium text-green-600">
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
