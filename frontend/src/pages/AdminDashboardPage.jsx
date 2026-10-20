import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  ShieldCheck, CheckCircle2, XCircle, Clock, Store,
  MapPin, RefreshCw, AlertTriangle, ExternalLink, Check, X
} from 'lucide-react';

import {
  getStoresByStatus,
  approveStore,
  rejectStore
} from '../features/admin/adminStoreApi';

import Modal from '../components/Modal';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { categoryBadge, fmtTime } from '../utils';

const TABS = [
  { id: 'PENDING', label: 'Pending Review', icon: Clock, color: 'text-amber-600', activeBg: 'bg-amber-50 text-amber-700 border-amber-300' },
  { id: 'APPROVED', label: 'Approved Stores', icon: CheckCircle2, color: 'text-green-600', activeBg: 'bg-green-50 text-green-700 border-green-300' },
  { id: 'REJECTED', label: 'Rejected Stores', icon: XCircle, color: 'text-red-600', activeBg: 'bg-red-50 text-red-700 border-red-300' },
];

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('PENDING');
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  // Confirmation modal state: { type: 'approve' | 'reject', store: StoreResponse }
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Tab counts (cached counts where available)
  const [tabCounts, setTabCounts] = useState({ PENDING: null, APPROVED: null, REJECTED: null });

  const fetchStores = useCallback(async (status) => {
    setLoading(true);
    try {
      const res = await getStoresByStatus(status);
      const data = res.data || [];
      setStores(data);
      setTabCounts((prev) => ({ ...prev, [status]: data.length }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch stores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores(activeTab);
  }, [fetchStores, activeTab]);

  const handleActionConfirm = async () => {
    if (!confirmAction) return;
    const { type, store } = confirmAction;
    setActionLoading(true);
    try {
      if (type === 'approve') {
        await approveStore(store.id);
        toast.success(`"${store.name}" approved successfully!`);
      } else {
        await rejectStore(store.id);
        toast.success(`"${store.name}" marked as rejected.`);
      }
      setConfirmAction(null);
      // Refresh current tab
      fetchStores(activeTab);
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${type} store`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-green-100 text-green-700 rounded-xl">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Store Approvals</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Review vendor applications and manage store authorization status across LocalKart.
              </p>
            </div>
          </div>
        </div>

        <Button
          id="admin-refresh-btn"
          variant="secondary"
          onClick={() => fetchStores(activeTab)}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count = tabCounts[tab.id];

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-3 text-sm font-semibold rounded-t-xl border-b-2 transition whitespace-nowrap ${
                isActive
                  ? 'border-green-600 text-green-700 bg-white shadow-sm'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/60'
              }`}
            >
              <Icon size={17} className={isActive ? 'text-green-600' : 'text-gray-400'} />
              <span>{tab.label}</span>
              {count !== null && count !== undefined && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Store Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-pulse space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-gray-200 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <div className="w-3/4 h-5 bg-gray-200 rounded" />
                  <div className="w-1/3 h-4 bg-gray-100 rounded" />
                </div>
              </div>
              <div className="w-full h-12 bg-gray-100 rounded-lg" />
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-50">
                <div className="w-24 h-9 bg-gray-200 rounded-xl" />
                <div className="w-24 h-9 bg-gray-200 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : stores.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <EmptyState
            icon={
              activeTab === 'PENDING' ? (
                <Clock size={48} className="mx-auto text-amber-400" />
              ) : activeTab === 'APPROVED' ? (
                <CheckCircle2 size={48} className="mx-auto text-green-400" />
              ) : (
                <XCircle size={48} className="mx-auto text-red-400" />
              )
            }
            title={
              activeTab === 'PENDING'
                ? 'No Pending Stores'
                : activeTab === 'APPROVED'
                ? 'No Approved Stores'
                : 'No Rejected Stores'
            }
            description={
              activeTab === 'PENDING'
                ? 'All store applications have been reviewed and approved or rejected.'
                : activeTab === 'APPROVED'
                ? 'There are currently no approved stores registered.'
                : 'No store applications have been rejected.'
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {stores.map((store) => {
            const badge = categoryBadge(store.category);

            return (
              <div
                key={store.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
              >
                {/* Store Header Info */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      {store.logoUrl ? (
                        <img
                          src={store.logoUrl}
                          alt={store.name}
                          className="w-14 h-14 rounded-xl object-cover border border-gray-100 flex-shrink-0"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=100&auto=format&fit=crop&q=60';
                          }}
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                          <Store size={26} />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-lg font-bold text-gray-900">{store.name}</h2>

                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.color}`}>
                            {badge.label}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
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
                          {store.status === 'APPROVED' && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                store.open
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {store.open ? 'Store Open' : 'Store Closed'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {store.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 bg-gray-50/70 p-2.5 rounded-xl border border-gray-100/60">
                      {store.description}
                    </p>
                  )}

                  {/* Location & Details Details */}
                  <div className="space-y-2 text-xs text-gray-600 pt-1">
                    <div className="flex items-start gap-2">
                      <MapPin size={15} className="text-gray-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span>{store.address}</span>
                        {store.pincode && (
                          <span className="ml-1 font-semibold text-gray-700">({store.pincode})</span>
                        )}
                      </div>
                    </div>

                    {(store.openTime || store.closeTime) && (
                      <div className="flex items-center gap-2">
                        <Clock size={15} className="text-gray-400 flex-shrink-0" />
                        <span>
                          Hours: {fmtTime(store.openTime)} &ndash; {fmtTime(store.closeTime)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-gray-400 font-mono">
                      <span>Coordinates: {store.latitude.toFixed(4)}, {store.longitude.toFixed(4)}</span>
                      <a
                        href={`https://www.google.com/maps?q=${store.latitude},${store.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 font-sans font-medium"
                      >
                        <ExternalLink size={12} /> Map View
                      </a>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-400">
                    Owner ID: <strong className="text-gray-600 font-mono">#{store.ownerId}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    {/* If PENDING: show Reject and Approve */}
                    {store.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setConfirmAction({ type: 'reject', store })}
                          className="px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100/80 rounded-xl transition border border-red-200"
                        >
                          Reject
                        </button>
                        <Button
                          type="button"
                          onClick={() => setConfirmAction({ type: 'approve', store })}
                          className="px-3.5 py-1.5 text-xs flex items-center gap-1"
                        >
                          <Check size={14} />
                          Approve
                        </Button>
                      </>
                    )}

                    {/* If APPROVED: allow rejecting if needed */}
                    {store.status === 'APPROVED' && (
                      <button
                        type="button"
                        onClick={() => setConfirmAction({ type: 'reject', store })}
                        className="px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100/80 rounded-xl transition border border-red-200 flex items-center gap-1"
                      >
                        <X size={13} />
                        Suspend / Reject
                      </button>
                    )}

                    {/* If REJECTED: allow approving */}
                    {store.status === 'REJECTED' && (
                      <Button
                        type="button"
                        onClick={() => setConfirmAction({ type: 'approve', store })}
                        className="px-3.5 py-1.5 text-xs flex items-center gap-1"
                      >
                        <Check size={14} />
                        Re-Approve
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <Modal
          title={
            confirmAction.type === 'approve'
              ? 'Approve Store Application'
              : 'Reject Store Application'
          }
          onClose={() => !actionLoading && setConfirmAction(null)}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div
              className={`flex items-start gap-3 p-4 rounded-xl border ${
                confirmAction.type === 'approve'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <AlertTriangle
                size={22}
                className={`flex-shrink-0 mt-0.5 ${
                  confirmAction.type === 'approve' ? 'text-green-600' : 'text-red-500'
                }`}
              />
              <div className="text-sm">
                <p className="font-bold">
                  {confirmAction.type === 'approve'
                    ? `Approve "${confirmAction.store.name}"?`
                    : `Reject "${confirmAction.store.name}"?`}
                </p>
                <p className="text-xs mt-1 leading-relaxed opacity-90">
                  {confirmAction.type === 'approve'
                    ? 'Approving this store will allow the owner to open the store and list products. It will become visible to customers nearby on the map.'
                    : 'Rejecting this store will prevent the owner from accepting orders or appearing in nearby customer searches.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmAction(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleActionConfirm}
                loading={actionLoading}
                className={
                  confirmAction.type === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }
              >
                {confirmAction.type === 'approve' ? 'Yes, Approve Store' : 'Yes, Reject Store'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
