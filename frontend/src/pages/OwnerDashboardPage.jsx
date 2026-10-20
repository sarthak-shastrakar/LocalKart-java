import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Store, Clock, CheckCircle, XCircle, AlertTriangle,
  ToggleLeft, ToggleRight, Pencil, Package,
} from 'lucide-react';

import { getMyStore, createStore, toggleOpen } from '../features/owner/ownerStoreApi';
import StoreForm from '../components/StoreForm';
import Spinner from '../components/Spinner';
import Button from '../components/Button';
import { categoryBadge, fmtTime } from '../utils';

/* ─── Status banner ───────────────────────────────── */
const STATUS_CONFIG = {
  PENDING: {
    icon: <Clock size={20} />,
    title: 'Waiting for admin approval',
    desc:  'Your store has been submitted and is under review. You\'ll be able to accept orders once approved.',
    cls:   'bg-amber-50 border-amber-200 text-amber-700',
    iconCls: 'text-amber-500',
  },
  APPROVED: {
    icon: <CheckCircle size={20} />,
    title: 'Store approved!',
    desc:  'Your store is live. Customers can find you on the map.',
    cls:   'bg-green-50 border-green-200 text-green-700',
    iconCls: 'text-green-500',
  },
  REJECTED: {
    icon: <XCircle size={20} />,
    title: 'Store rejected',
    desc:  'Your store was not approved. Please update your details and contact support.',
    cls:   'bg-red-50 border-red-200 text-red-700',
    iconCls: 'text-red-500',
  },
};

function StatusBanner({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <div className={`flex items-start gap-3 p-4 rounded-2xl border ${cfg.cls}`}>
      <span className={`mt-0.5 flex-shrink-0 ${cfg.iconCls}`}>{cfg.icon}</span>
      <div>
        <p className="font-semibold text-sm">{cfg.title}</p>
        <p className="text-xs mt-0.5 opacity-80">{cfg.desc}</p>
      </div>
    </div>
  );
}

/* ─── Open / Closed toggle ────────────────────────── */
function OpenToggle({ store, onToggle }) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await toggleOpen(!store.open);
      onToggle(res.data);
      toast.success(res.data.open ? 'Store is now Open 🟢' : 'Store is now Closed 🔴');
    } catch {
      toast.error('Could not update store status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      id="open-toggle-btn"
      onClick={handleToggle}
      disabled={loading || store.status !== 'APPROVED'}
      title={store.status !== 'APPROVED' ? 'Only approved stores can toggle open/closed' : ''}
      className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl border-2 font-semibold text-sm transition-all w-full sm:w-auto
        ${store.open
          ? 'border-green-400 bg-green-50 text-green-700 hover:bg-green-100'
          : 'border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-100'}
        ${(loading || store.status !== 'APPROVED') ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {loading
        ? <Spinner size="sm" />
        : store.open
          ? <ToggleRight size={22} className="text-green-500" />
          : <ToggleLeft size={22} className="text-gray-400" />
      }
      <span>Store is <strong>{store.open ? 'Open' : 'Closed'}</strong></span>
      <span className="ml-auto text-xs font-normal opacity-60">
        {store.status !== 'APPROVED' ? '(requires approval)' : 'Click to toggle'}
      </span>
    </button>
  );
}

/* ─── Store info card ─────────────────────────────── */
function StoreInfoCard({ store }) {
  const cat = categoryBadge(store.category);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-start gap-4">
        {store.logoUrl ? (
          <img src={store.logoUrl} alt={store.name}
            className="h-16 w-16 rounded-xl object-cover border border-gray-100 flex-shrink-0" />
        ) : (
          <div className="h-16 w-16 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <Store className="text-green-400" size={28} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-gray-800 truncate">{store.name}</h2>
          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${cat.color}`}>
            {cat.label}
          </span>
        </div>
        <Link to="/owner/store/edit" id="edit-store-btn">
          <Button variant="secondary" className="gap-2 shrink-0">
            <Pencil size={14} /> Edit
          </Button>
        </Link>
      </div>

      {store.description && (
        <p className="text-sm text-gray-500">{store.description}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
        <div>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Address</span>
          <p className="mt-0.5">{store.address}, {store.pincode}</p>
        </div>
        {store.openTime && store.closeTime && (
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Hours</span>
            <p className="mt-0.5">{fmtTime(store.openTime)} – {fmtTime(store.closeTime)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────── */
export default function OwnerDashboardPage() {
  const [store, setStore]   = useState(null);   // null = loading, false = not created
  const [pageLoading, setPageLoading] = useState(true);
  const [creating, setCreating]       = useState(false);

  useEffect(() => {
    getMyStore()
      .then((res) => setStore(res.data))
      .catch((err) => {
        if (err.response?.status === 404) setStore(false);  // no store yet
        else toast.error('Failed to load store data.');
      })
      .finally(() => setPageLoading(false));
  }, []);

  const handleCreate = async (data, setError) => {
    setCreating(true);
    try {
      const res = await createStore(data);
      setStore(res.data);
      toast.success('Store created! Awaiting admin approval.');
    } catch (err) {
      const status = err.response?.status;
      const body   = err.response?.data;
      if (status === 409) {
        toast.error('You already have a store.');
      } else if (status === 400 && body?.errors) {
        Object.entries(body.errors).forEach(([f, msg]) => setError(f, { message: msg }));
      } else {
        toast.error(body?.message || 'Could not create store.');
      }
    } finally {
      setCreating(false);
    }
  };

  /* Loading */
  if (pageLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  /* ── No store yet → create form ── */
  if (store === false) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Create your store</h1>
          <p className="text-sm text-gray-500 mt-1">
            Fill in the details below to register your store on LocalKart.
            An admin will review and approve it shortly.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <StoreForm
            submitLabel="Create Store"
            isSubmitting={creating}
            onSubmit={handleCreate}
          />
        </div>
      </div>
    );
  }

  /* ── Store exists → dashboard ── */
  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Store</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your store details and availability</p>
        </div>
        <Link to="/owner/products" id="go-to-products-btn">
          <Button variant="outline" className="gap-2">
            <Package size={16} /> Manage Products
          </Button>
        </Link>
      </div>

      {/* Status banner */}
      <StatusBanner status={store.status} />

      {/* Open / Closed toggle */}
      <OpenToggle store={store} onToggle={setStore} />

      {/* Store info */}
      <StoreInfoCard store={store} />
    </div>
  );
}
