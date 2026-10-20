import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  User, Mail, Shield, Store, MapPin, Package,
  ExternalLink, LogOut, Trash2, AlertTriangle, CheckCircle2,
  Clock, XCircle, Camera, Loader2
} from 'lucide-react';

import { clearAuth, setUser } from '../features/auth/authSlice';
import { resetCart } from '../features/cart/cartSlice';
import { deleteAccountApi } from '../features/auth/authApi';
import { getMyStore } from '../features/owner/ownerStoreApi';
import { uploadProfilePhoto, deleteProfilePhoto } from '../features/uploads/uploadApi';
import Modal from '../components/Modal';
import Button from '../components/Button';
import Avatar from '../components/Avatar';

export default function ProfilePage() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Store data for STORE_OWNER
  const [store, setStore] = useState(null);
  const [storeLoading, setStoreLoading] = useState(false);

  // Delete account confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Profile photo state
  const fileInputRef = useRef(null);
  const [photoLoading, setPhotoLoading] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and WEBP formats are supported');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Image size must be 3 MB or less');
      return;
    }

    setPhotoLoading(true);
    try {
      const res = await uploadProfilePhoto(file);
      dispatch(setUser(res.data));
      toast.success('Profile photo updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload profile photo');
    } finally {
      setPhotoLoading(false);
    }
  };

  const handlePhotoDelete = async () => {
    setPhotoLoading(true);
    try {
      await deleteProfilePhoto();
      dispatch(setUser({ ...user, profileImageUrl: null }));
      toast.success('Profile photo removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove profile photo');
    } finally {
      setPhotoLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'STORE_OWNER') {
      setStoreLoading(true);
      getMyStore()
        .then((res) => setStore(res.data))
        .catch(() => setStore(null))
        .finally(() => setStoreLoading(false));
    }
  }, [user]);

  const handleLogout = () => {
    dispatch(clearAuth());
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccountApi();
      dispatch(clearAuth());
      dispatch(resetCart());
      toast.success('Your account and all associated data have been permanently deleted.');
      setDeleteModalOpen(false);
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500">Please sign in to view your profile.</p>
        <Link to="/login" className="mt-3 inline-block text-green-600 font-semibold hover:underline">
          Go to Login
        </Link>
      </div>
    );
  }

  const roleLabel = {
    CUSTOMER: 'Customer',
    STORE_OWNER: 'Store Owner / Vendor',
    ADMIN: 'Administrator',
  }[user.role] || user.role;

  const roleBadgeColor = {
    CUSTOMER: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    STORE_OWNER: 'bg-blue-100 text-blue-800 border-blue-200',
    ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
  }[user.role] || 'bg-gray-100 text-gray-800';

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Profile Header Banner */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          {/* Avatar with photo actions */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="relative group">
              <Avatar
                src={user.profileImageUrl}
                name={user.name}
                size="lg"
                className="w-20 h-20 shadow-md ring-2 ring-white/40"
              />
              {photoLoading && (
                <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center text-white">
                  <Loader2 size={24} className="animate-spin" />
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoLoading}
                aria-label="Change profile photo"
                className="absolute inset-0 rounded-full bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition disabled:opacity-0"
              >
                <Camera size={18} />
                <span className="text-[10px] font-semibold mt-0.5">Change</span>
              </button>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoUpload}
              className="sr-only"
              aria-label="Upload profile photo"
            />

            {/* Photo Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoLoading}
                className="text-[11px] font-medium text-green-100 hover:text-white underline disabled:opacity-50"
              >
                Change photo
              </button>
              {user.profileImageUrl && (
                <>
                  <span className="text-white/40 text-xs">·</span>
                  <button
                    type="button"
                    onClick={handlePhotoDelete}
                    disabled={photoLoading}
                    className="text-[11px] font-medium text-red-200 hover:text-red-100 underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h1 className="text-2xl font-bold">{user.name}</h1>
              <span className={`self-center sm:self-auto px-3 py-0.5 rounded-full text-xs font-bold border ${roleBadgeColor}`}>
                {roleLabel}
              </span>
            </div>
            <p className="text-green-100 text-sm flex items-center justify-center sm:justify-start gap-1.5">
              <Mail size={15} />
              {user.email}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="mt-2 sm:mt-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur border border-white/20 transition"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Account Details Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
          <User size={18} className="text-green-600" />
          Personal Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-medium">Full Name</span>
            <p className="font-semibold text-gray-800">{user.name}</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-medium">Email Address</span>
            <p className="font-semibold text-gray-800">{user.email}</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-medium">User Role</span>
            <p className="font-semibold text-gray-800">{roleLabel}</p>
          </div>

        </div>
      </div>

      {/* Role-Specific Content */}
      {user.role === 'CUSTOMER' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
            <Store size={18} className="text-green-600" />
            Customer Quick Links
          </h2>
          <p className="text-sm text-gray-500">
            As a LocalKart customer, you can discover approved local kirana, medical, and bakery stores around your neighbourhood.
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition"
            >
              <MapPin size={16} />
              Explore Nearby Stores
            </Link>
          </div>
        </div>
      )}

      {user.role === 'STORE_OWNER' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
            <Store size={18} className="text-blue-600" />
            Vendor & Store Info
          </h2>

          {storeLoading ? (
            <p className="text-sm text-gray-400 animate-pulse">Loading store information...</p>
          ) : store ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-900">{store.name}</h3>
                  <p className="text-xs text-gray-500">{store.address}, {store.pincode}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold ${
                      store.status === 'APPROVED'
                        ? 'bg-green-100 text-green-700'
                        : store.status === 'REJECTED'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {store.status === 'APPROVED' ? (
                      <CheckCircle2 size={12} />
                    ) : store.status === 'REJECTED' ? (
                      <XCircle size={12} />
                    ) : (
                      <Clock size={12} />
                    )}
                    {store.status}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      store.open ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {store.open ? 'Open' : 'Closed'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Link
                  to="/owner"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold transition"
                >
                  <Store size={15} />
                  Store Dashboard
                </Link>
                <Link
                  to="/owner/products"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition"
                >
                  <Package size={15} />
                  Manage Products
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">You haven't registered a store yet.</p>
              <Link
                to="/owner"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition"
              >
                Create Your Store
              </Link>
            </div>
          )}
        </div>
      )}

      {user.role === 'ADMIN' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
            <Shield size={18} className="text-purple-600" />
            Administrator Panel
          </h2>
          <p className="text-sm text-gray-500">
            You have full administrative privileges to review, approve, and reject new store applications across all categories.
          </p>
          <div className="pt-2">
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition"
            >
              <ExternalLink size={16} />
              Open Admin Verification Panel
            </Link>
          </div>
        </div>
      )}

      {/* Danger Zone: Account Deletion */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6 space-y-4">
        <h2 className="text-base font-bold text-red-600 border-b border-red-50 pb-3 flex items-center gap-2">
          <AlertTriangle size={18} />
          Danger Zone
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">Delete Account</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Permanently close and delete your account from this device.
            </p>
          </div>

          <Button
            id="profile-delete-account-btn"
            type="button"
            variant="danger"
            onClick={() => setDeleteModalOpen(true)}
            className="self-start sm:self-auto bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 px-4 py-2 text-sm"
          >
            <Trash2 size={15} />
            Delete Account
          </Button>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {deleteModalOpen && (
        <Modal
          title="Delete Account"
          onClose={() => !deleting && setDeleteModalOpen(false)}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 text-red-800 rounded-xl border border-red-100">
              <AlertTriangle size={22} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold">Are you sure you want to permanently delete your account?</p>
                <p className="text-xs text-red-600 mt-1 leading-relaxed">
                  This action is permanent and cannot be undone. All your personal data, along with your stores, products, appeals, and cart items will be completely removed from the database.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteAccount}
                loading={deleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Yes, Delete My Account
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
