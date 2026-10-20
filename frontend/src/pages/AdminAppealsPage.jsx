import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  FileText, RefreshCw, CheckCircle2, XCircle, Clock, Shield,
  Store, User, AlertTriangle, Check, X, Quote, UserCheck
} from 'lucide-react';

import {
  getAppeals,
  getPendingAppealCounts,
  approveAppeal,
  rejectAppeal
} from '../features/admin/appealAdminApi';

import Modal from '../components/Modal';
import Button from '../components/Button';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import { fmtDate, fmtDateTime, blockReasonBadge } from '../utils';

const STATUS_PILLS = [
  { id: 'PENDING', label: 'Pending', icon: Clock },
  { id: 'APPROVED', label: 'Approved', icon: CheckCircle2 },
  { id: 'REJECTED', label: 'Rejected', icon: XCircle },
];

export default function AdminAppealsPage() {
  const [mine, setMine] = useState(false); // false = All appeals, true = Assigned to me
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(0);

  const [appeals, setAppeals] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);

  // Tab counts
  const [counts, setCounts] = useState({ mine: 0, all: 0 });

  // Decision Modal state: { type: 'approve' | 'reject', appeal }
  const [actionModal, setActionModal] = useState(null);
  const [note, setNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  const fetchCounts = useCallback(async () => {
    try {
      const res = await getPendingAppealCounts();
      setCounts(res.data || { mine: 0, all: 0 });
    } catch {
      // non-blocking
    }
  }, []);

  const fetchAppealsList = useCallback(async (isMine, appealStatus, p = 0) => {
    setLoading(true);
    try {
      const res = await getAppeals({
        mine: isMine,
        status: appealStatus,
        page: p,
        size: 10,
      });
      setAppeals(res.data.items || []);
      setPage(res.data.page ?? p);
      setTotalPages(res.data.totalPages ?? 0);
      setTotalItems(res.data.totalItems ?? 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load appeals');
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount & tab changes
  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    fetchAppealsList(mine, status, page);
  }, [fetchAppealsList, mine, status, page]);

  // Reset page when switching main tabs or status pills
  const handleTabChange = (newMine) => {
    setMine(newMine);
    setPage(0);
  };

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    setPage(0);
  };

  const handleRefresh = () => {
    fetchCounts();
    fetchAppealsList(mine, status, page);
  };

  // Open Decision Modal
  const openAction = (type, appeal) => {
    setActionModal({ type, appeal });
    setNote('');
    setActionError(null);
  };

  // Confirm Decision
  const handleConfirmDecision = async () => {
    if (!actionModal) return;
    const { type, appeal } = actionModal;

    if (type === 'reject' && !note.trim()) {
      setActionError('Reason is required when rejecting an appeal.');
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      if (type === 'approve') {
        await approveAppeal(appeal.id, { note: note.trim() || undefined });
        toast.success(`Appeal approved. ${appeal.userName} is now unblocked.`);
      } else {
        await rejectAppeal(appeal.id, { note: note.trim() });
        toast.success(`Appeal from ${appeal.userName} has been rejected.`);
      }

      // Remove card from list in place
      setAppeals((prev) => prev.filter((a) => a.id !== appeal.id));
      setTotalItems((prev) => Math.max(0, prev - 1));

      // Refresh badges & notify Navbar
      fetchCounts();
      window.dispatchEvent(new Event('appeal-updated'));

      setActionModal(null);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || `Failed to ${type} appeal`;
      if (status === 409) {
        toast.error('Appeal already decided by another administrator.');
        setActionModal(null);
        handleRefresh();
      } else if (status === 400) {
        setActionError(msg);
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
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Unblock Appeals</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Review and process account restoration requests submitted by blocked users.
              </p>
            </div>
          </div>
        </div>

        <Button
          id="admin-refresh-appeals-btn"
          variant="secondary"
          onClick={handleRefresh}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {/* Main Tabs: Assigned to me vs All appeals */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-1">
          <button
            type="button"
            id="tab-assigned-to-me"
            onClick={() => handleTabChange(true)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-t-xl border-b-2 transition whitespace-nowrap ${
              mine
                ? 'border-green-600 text-green-700 bg-white shadow-sm'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/60'
            }`}
          >
            <UserCheck size={16} />
            <span>Assigned to me</span>
            {counts.mine > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700">
                {counts.mine}
              </span>
            )}
          </button>

          <button
            type="button"
            id="tab-all-appeals"
            onClick={() => handleTabChange(false)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-t-xl border-b-2 transition whitespace-nowrap ${
              !mine
                ? 'border-green-600 text-green-700 bg-white shadow-sm'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/60'
            }`}
          >
            <FileText size={16} />
            <span>All appeals</span>
            {counts.all > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700">
                {counts.all}
              </span>
            )}
          </button>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-2">
          {STATUS_PILLS.map((pill) => {
            const Icon = pill.icon;
            const isActive = status === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                id={`status-pill-${pill.id.toLowerCase()}`}
                onClick={() => handleStatusChange(pill.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition ${
                  isActive
                    ? 'bg-green-600 text-white border-green-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Icon size={14} />
                <span>{pill.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Appeals Content */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-pulse space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div className="space-y-2">
                    <div className="w-36 h-4 bg-gray-200 rounded" />
                    <div className="w-24 h-3 bg-gray-100 rounded" />
                  </div>
                </div>
                <div className="w-20 h-6 bg-gray-200 rounded-full" />
              </div>
              <div className="w-full h-16 bg-gray-100 rounded-xl" />
              <div className="flex justify-between items-center pt-2">
                <div className="w-32 h-4 bg-gray-100 rounded" />
                <div className="w-24 h-8 bg-gray-200 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : appeals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <EmptyState
            icon={
              status === 'PENDING' ? (
                <Clock size={48} className="mx-auto text-amber-400" />
              ) : status === 'APPROVED' ? (
                <CheckCircle2 size={48} className="mx-auto text-green-400" />
              ) : (
                <XCircle size={48} className="mx-auto text-red-400" />
              )
            }
            title={
              status === 'PENDING'
                ? 'No pending appeals'
                : status === 'APPROVED'
                ? 'No approved appeals'
                : 'No rejected appeals'
            }
            description={
              status === 'PENDING'
                ? mine
                  ? 'You have no pending unblock appeals assigned to you.'
                  : 'There are currently no pending unblock appeals awaiting review.'
                : 'No appeals found in this category.'
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {appeals.map((appeal) => {
            const reasonBadge = blockReasonBadge(appeal.blockReason);

            return (
              <div
                key={appeal.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden p-5 sm:p-6 space-y-4"
              >
                {/* Header: User Info & Role */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-gray-100 text-gray-700 font-bold flex items-center justify-center text-sm shrink-0">
                      {appeal.userName ? appeal.userName[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-bold text-gray-900">{appeal.userName}</h2>
                        {getRoleBadge(appeal.userRole)}
                        <span className="text-xs font-mono text-gray-400">ID: #{appeal.userId}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{appeal.userEmail}</p>
                    </div>
                  </div>

                  {/* Status Tag */}
                  <div>
                    {appeal.status === 'PENDING' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock size={13} /> Pending Review
                      </span>
                    )}
                    {appeal.status === 'APPROVED' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                        <CheckCircle2 size={13} /> Approved
                      </span>
                    )}
                    {appeal.status === 'REJECTED' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                        <XCircle size={13} /> Rejected
                      </span>
                    )}
                  </div>
                </div>

                {/* Block Context Bar */}
                <div className="bg-gray-50/80 rounded-xl p-3.5 border border-gray-100 text-xs space-y-1.5">
                  <div className="flex flex-wrap items-center gap-3 text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">Blocked reason:</span>
                      <span className={`px-2 py-0.5 rounded-full font-semibold border ${reasonBadge.color}`}>
                        {reasonBadge.label}
                      </span>
                    </div>

                    <div className="text-gray-400">•</div>

                    <div>
                      <span className="text-gray-400">Blocked by:</span>{' '}
                      <strong className="text-gray-700">{appeal.blockedByName || 'Unknown'}</strong>
                    </div>

                    {appeal.blockedAt && (
                      <>
                        <div className="text-gray-400">•</div>
                        <div>
                          <span className="text-gray-400">Blocked on:</span>{' '}
                          <span className="text-gray-700">{fmtDate(appeal.blockedAt)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {appeal.blockNote && (
                    <div className="text-gray-600 pt-1 border-t border-gray-100/60">
                      <span className="font-semibold text-gray-500">Block note:</span> {appeal.blockNote}
                    </div>
                  )}
                </div>

                {/* User's Appeal Message */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Quote size={12} className="text-gray-400" /> User Explanation
                  </span>
                  <div className="bg-green-50/40 border border-green-100/80 rounded-xl p-3.5 text-sm text-gray-800 italic leading-relaxed">
                    &ldquo;{appeal.message}&rdquo;
                  </div>
                </div>

                {/* Decision Info (if decided) */}
                {appeal.status !== 'PENDING' && (
                  <div className="p-3.5 rounded-xl border bg-gray-50 border-gray-100 text-xs space-y-1 text-gray-700">
                    <div className="flex items-center justify-between text-gray-500">
                      <span>Reviewed by: <strong className="text-gray-800">{appeal.reviewedByName || 'Admin'}</strong></span>
                      <span>{fmtDateTime(appeal.reviewedAt)}</span>
                    </div>
                    {appeal.adminNote && (
                      <div className="pt-1 text-gray-800">
                        <span className="font-semibold text-gray-600">Admin Note:</span> {appeal.adminNote}
                      </div>
                    )}
                  </div>
                )}

                {/* Footer: Date & Action Buttons */}
                <div className="pt-2 border-t border-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-400">
                  <div>
                    Submitted on: <span className="text-gray-600">{fmtDateTime(appeal.createdAt)}</span>
                  </div>

                  {appeal.status === 'PENDING' && (
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => openAction('reject', appeal)}
                        className="py-1.5 px-3 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 border border-red-200"
                      >
                        <X size={14} /> Reject
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => openAction('approve', appeal)}
                        className="py-1.5 px-3 text-xs font-semibold flex items-center gap-1"
                      >
                        <Check size={14} /> Approve &amp; Unblock
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={(newPage) => setPage(newPage)}
              />
            </div>
          )}
        </div>
      )}

      {/* Approve / Reject Action Modal */}
      {actionModal && (
        <Modal
          title={
            actionModal.type === 'approve'
              ? `Unblock ${actionModal.appeal.userName}?`
              : `Reject Appeal from ${actionModal.appeal.userName}`
          }
          onClose={() => !actionLoading && setActionModal(null)}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            {/* Context callout */}
            <div
              className={`flex items-start gap-3 p-3.5 rounded-xl border text-sm ${
                actionModal.type === 'approve'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <AlertTriangle
                size={20}
                className={`shrink-0 mt-0.5 ${
                  actionModal.type === 'approve' ? 'text-green-600' : 'text-red-500'
                }`}
              />
              <div className="text-xs space-y-1">
                <p className="font-bold">
                  {actionModal.type === 'approve'
                    ? 'Approving will immediately unblock this user.'
                    : 'The user will see this rejection reason in their status check.'}
                </p>
                <p className="opacity-90 leading-relaxed">
                  {actionModal.type === 'approve'
                    ? 'The user will be able to log in and use LocalKart again.'
                    : 'The user will be in a 7-day cooldown period before being able to submit another appeal.'}
                </p>
              </div>
            </div>

            {/* Inline Error */}
            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {actionError}
              </div>
            )}

            {/* Note Textarea */}
            <div className="space-y-1.5">
              <label htmlFor="appeal-action-note" className="block text-xs font-semibold text-gray-700">
                {actionModal.type === 'approve' ? 'Optional note' : 'Rejection reason (Required)'}
              </label>
              <textarea
                id="appeal-action-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  actionModal.type === 'approve'
                    ? 'Add an optional note for reference...'
                    : 'Explain clearly why the appeal is rejected (visible to user)...'
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              {actionModal.type === 'reject' && (
                <p className="text-[11px] text-gray-400">
                  Please provide a clear justification for rejecting the appeal.
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setActionModal(null)}
                disabled={actionLoading}
                className="text-xs py-2 px-3.5"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDecision}
                loading={actionLoading}
                disabled={actionModal.type === 'reject' && !note.trim()}
                className={`text-xs py-2 px-4 ${
                  actionModal.type === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white disabled:bg-red-300'
                }`}
              >
                {actionModal.type === 'approve' ? 'Yes, Unblock User' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
