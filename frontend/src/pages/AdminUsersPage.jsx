import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  Users, Search, RefreshCw, Shield, Store, User,
  CheckCircle2, XCircle, AlertTriangle, Info, Check, Ban
} from 'lucide-react';

import {
  getUsers,
  blockUser,
  unblockUser,
} from '../features/admin/userAdminApi';

import Modal from '../components/Modal';
import Button from '../components/Button';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import useDebounce from '../hooks/useDebounce';
import { blockReasonBadge } from '../utils';

const ROLE_TABS = [
  { id: 'ALL', label: 'All Users', role: null },
  { id: 'CUSTOMER', label: 'Customers', role: 'CUSTOMER' },
  { id: 'STORE_OWNER', label: 'Store Owners', role: 'STORE_OWNER' },
  { id: 'ADMIN', label: 'Admins', role: 'ADMIN' },
];

const BLOCK_REASONS = [
  { value: 'FRAUD', label: 'Fraud' },
  { value: 'FAKE_STORE', label: 'Fake store' },
  { value: 'ABUSIVE_BEHAVIOR', label: 'Abusive behavior' },
  { value: 'POLICY_VIOLATION', label: 'Policy violation' },
  { value: 'OTHER', label: 'Other' },
];

export default function AdminUsersPage() {
  const { user: currentUser } = useSelector((s) => s.auth);

  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 400);

  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);

  // Confirm modal state: { type: 'block' | 'unblock', targetUser }
  const [confirmModal, setConfirmModal] = useState(null);
  const [blockReason, setBlockReason] = useState('OTHER');
  const [blockNote, setBlockNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Selected role from tab
  const selectedRole = ROLE_TABS.find((t) => t.id === activeTab)?.role || null;

  const fetchUsers = useCallback(async (role, q, p = 0) => {
    setLoading(true);
    try {
      const res = await getUsers({
        role: q ? null : role,
        q,
        page: p,
        size: 10,
      });
      setUsers(res.data.items || []);
      setPage(res.data.page ?? p);
      setTotalPages(res.data.totalPages ?? 0);
      setTotalItems(res.data.totalItems ?? 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when role, debounced query, or page changes
  useEffect(() => {
    fetchUsers(selectedRole, debouncedQuery, page);
  }, [fetchUsers, selectedRole, debouncedQuery, page]);

  // Reset to page 0 on search query or tab change
  useEffect(() => {
    setPage(0);
  }, [debouncedQuery, activeTab]);

  const openBlockModal = (targetUser) => {
    setConfirmModal({ type: 'block', targetUser });
    setBlockReason('OTHER');
    setBlockNote('');
  };

  const openUnblockModal = (targetUser) => {
    setConfirmModal({ type: 'unblock', targetUser });
  };

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    const { type, targetUser } = confirmModal;
    setActionLoading(true);
    try {
      let res;
      if (type === 'block') {
        res = await blockUser(targetUser.id, {
          reason: blockReason,
          note: blockNote.trim() || undefined,
        });
        toast.success(`User ${targetUser.name} blocked successfully.`);
      } else {
        res = await unblockUser(targetUser.id);
        toast.success(`User ${targetUser.name} unblocked successfully.`);
      }
      const updated = res.data;
      // In-place row update without full reload
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, ...updated } : u))
      );
      setConfirmModal(null);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || `Failed to ${type} user`;
      if (status === 409) {
        toast.error(msg);
        setConfirmModal(null);
        fetchUsers(selectedRole, debouncedQuery, page);
      } else {
        toast.error(msg);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
            <Shield size={12} /> Admin
          </span>
        );
      case 'STORE_OWNER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
            <Store size={12} /> Store Owner
          </span>
        );
      case 'CUSTOMER':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
            <User size={12} /> Customer
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-green-100 text-green-700 rounded-xl">
              <Users size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Manage customer, vendor, and administrator accounts across LocalKart.
              </p>
            </div>
          </div>
        </div>

        <Button
          id="admin-refresh-users-btn"
          variant="secondary"
          onClick={() => fetchUsers(selectedRole, debouncedQuery, page)}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="space-y-4">
        {/* Role Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-1">
          {ROLE_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? 'border-green-600 text-green-700 bg-white shadow-sm'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/60'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative max-w-md">
          <label htmlFor="admin-user-search" className="sr-only">
            Search users by name or email
          </label>
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            id="admin-user-search"
            type="text"
            placeholder="Search by name or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm bg-white"
          />
        </div>

        {/* Note when search is active */}
        {debouncedQuery.trim() !== '' && (
          <div className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <Info size={15} className="text-amber-600 shrink-0" />
            <span>
              Search active: searching across all user names and emails (the role filter tab is ignored during search).
            </span>
          </div>
        )}
      </div>

      {/* Main Users Table / Cards */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div className="space-y-2 flex-1">
                <div className="w-44 h-4 bg-gray-200 rounded" />
                <div className="w-32 h-3 bg-gray-100 rounded" />
              </div>
              <div className="w-24 h-6 bg-gray-200 rounded-full" />
              <div className="w-16 h-6 bg-gray-200 rounded-full" />
              <div className="w-20 h-8 bg-gray-200 rounded-lg" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <EmptyState
            icon={<Users size={48} className="mx-auto text-gray-300" />}
            title="No users found"
            description={
              debouncedQuery
                ? `No users match "${debouncedQuery}". Try refining your search query.`
                : 'No users exist under the selected filter category.'
            }
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">User</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {users.map((u) => {
                  const isSelf =
                    currentUser &&
                    (u.id === currentUser.id ||
                      u.email.toLowerCase() === currentUser.email?.toLowerCase());
                  const isAdmin = u.role === 'ADMIN';

                  return (
                    <tr
                      key={u.id}
                      className={`transition-colors hover:bg-gray-50/70 ${
                        !u.enabled ? 'bg-red-50/30' : ''
                      }`}
                    >
                      {/* Name & ID */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {u.name ? u.name[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{u.name}</span>
                              {isSelf && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                                  You
                                </span>
                              )}
                            </div>

                          </div>
                        </div>
                      </td>

                      {/* Contact: Email & Phone */}
                      <td className="py-4 px-4">
                        <div className="text-xs space-y-0.5">
                          <div className="text-gray-700 font-medium">{u.email}</div>
                          <div className="text-gray-400">{u.phone ? `+91 ${u.phone}` : '—'}</div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-4 px-4 whitespace-nowrap">{getRoleBadge(u.role)}</td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {u.enabled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 whitespace-nowrap">
                            <CheckCircle2 size={12} /> Active
                          </span>
                        ) : (
                          <div className="space-y-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 whitespace-nowrap">
                              <XCircle size={12} /> Blocked
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {u.blockedReason && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${blockReasonBadge(u.blockedReason).color}`}>
                                  {blockReasonBadge(u.blockedReason).label}
                                </span>
                              )}
                              <span className="text-[11px] text-gray-500 whitespace-nowrap">
                                Blocked by <strong className="text-gray-700">{u.blockedByName || 'Unknown'}</strong>
                              </span>
                            </div>
                            {u.blockedNote && (
                              <p className="text-[11px] text-gray-600 bg-red-50/60 p-1.5 rounded-lg border border-red-100 max-w-xs break-words" title={u.blockedNote}>
                                <span className="font-semibold text-gray-500">Note:</span> {u.blockedNote}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        {isSelf ? (
                          <span className="text-xs text-gray-400 italic">Current Session</span>
                        ) : isAdmin ? (
                          <span className="text-xs text-gray-400 italic">Admin Protected</span>
                        ) : u.enabled ? (
                          <button
                            type="button"
                            onClick={() => openBlockModal(u)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition disabled:opacity-50"
                          >
                            <Ban size={13} /> Block
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openUnblockModal(u)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition disabled:opacity-50"
                          >
                            <Check size={13} /> Unblock
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden divide-y divide-gray-100">
            {users.map((u) => {
              const isSelf =
                currentUser &&
                (u.id === currentUser.id ||
                  u.email.toLowerCase() === currentUser.email?.toLowerCase());
              const isAdmin = u.role === 'ADMIN';

              return (
                <div
                  key={u.id}
                  className={`p-4 space-y-3 ${!u.enabled ? 'bg-red-50/30' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-700 font-bold flex items-center justify-center text-xs shrink-0">
                        {u.name ? u.name[0].toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-gray-900 text-sm">{u.name}</p>
                          {isSelf && (
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>

                    <div>
                      {u.enabled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700">
                          Active
                        </span>
                      ) : (
                        <div className="text-right space-y-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700">
                            Blocked
                          </span>
                          {u.blockedReason && (
                            <div>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${blockReasonBadge(u.blockedReason).color}`}>
                                {blockReasonBadge(u.blockedReason).label}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {!u.enabled && (
                    <div className="bg-red-50/50 p-2.5 rounded-xl border border-red-100 text-xs text-gray-600 space-y-1">
                      <div>
                        Blocked by <strong className="text-gray-800">{u.blockedByName || 'Unknown'}</strong>
                      </div>
                      {u.blockedNote && (
                        <div className="text-gray-700">
                          <span className="font-semibold text-gray-500">Note:</span> {u.blockedNote}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-50 text-gray-500">
                    <div>{getRoleBadge(u.role)}</div>
                    <div>{u.phone ? `+91 ${u.phone}` : 'No phone'}</div>
                  </div>

                  {/* Mobile Action Button */}
                  <div className="pt-1 flex justify-end">
                    {isSelf ? (
                      <span className="text-xs text-gray-400 italic">Current Session</span>
                    ) : isAdmin ? (
                      <span className="text-xs text-gray-400 italic">Admin Protected</span>
                    ) : u.enabled ? (
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => openBlockModal(u)}
                        disabled={actionLoading}
                        className="py-1 px-3 text-xs bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Ban size={12} /> Block User
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => openUnblockModal(u)}
                        disabled={actionLoading}
                        className="py-1 px-3 text-xs bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check size={12} /> Unblock User
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={(newPage) => setPage(newPage)}
              />
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <Modal
          title={confirmModal.type === 'block' ? 'Block User' : 'Unblock User'}
          onClose={() => !actionLoading && setConfirmModal(null)}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div
              className={`flex items-start gap-3 p-4 rounded-xl border ${
                confirmModal.type === 'block'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-green-50 border-green-200 text-green-800'
              }`}
            >
              <AlertTriangle
                size={22}
                className={`shrink-0 mt-0.5 ${
                  confirmModal.type === 'block' ? 'text-red-500' : 'text-green-600'
                }`}
              />
              <div className="text-sm">
                <p className="font-bold">
                  {confirmModal.type === 'block'
                    ? `Block ${confirmModal.targetUser.name} (${confirmModal.targetUser.email})?`
                    : `Unblock ${confirmModal.targetUser.name} (${confirmModal.targetUser.email})?`}
                </p>
                <p className="text-xs mt-1 leading-relaxed opacity-90">
                  {confirmModal.type === 'block'
                    ? "They won't be able to log in, and their store will be hidden if they are a store owner."
                    : 'They will be able to log in again and access LocalKart.'}
                </p>
                {confirmModal.type === 'unblock' && (
                  <p className="text-xs mt-2 font-medium text-green-800 bg-green-100/70 p-2 rounded-lg border border-green-200">
                    If this user has a pending appeal it will be closed automatically.
                  </p>
                )}
              </div>
            </div>

            {/* Block reason select & note textarea if type === 'block' */}
            {confirmModal.type === 'block' && (
              <div className="space-y-3 pt-1">
                <div>
                  <label htmlFor="block-reason-select" className="block text-xs font-semibold text-gray-700 mb-1">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="block-reason-select"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
                  >
                    {BLOCK_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="block-note-textarea" className="block text-xs font-semibold text-gray-700">
                      Note (Optional)
                    </label>
                    <span className="text-[11px] text-gray-400 font-mono">
                      {blockNote.length}/500
                    </span>
                  </div>
                  <textarea
                    id="block-note-textarea"
                    rows={3}
                    maxLength={500}
                    value={blockNote}
                    onChange={(e) => setBlockNote(e.target.value)}
                    placeholder="Add details about this block (max 500 characters)..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmModal(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmAction}
                loading={actionLoading}
                className={
                  confirmModal.type === 'block'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }
              >
                {confirmModal.type === 'block' ? 'Yes, Block' : 'Yes, Unblock'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
