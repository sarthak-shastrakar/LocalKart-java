import api from '../../api/axios';

/**
 * Fetch stores by status (PENDING, APPROVED, REJECTED)
 * @param {string} status
 */
export const getStoresByStatus = (status = 'PENDING') =>
  api.get('/admin/stores', { params: { status } });

/**
 * Approve a store by ID
 * @param {number|string} id
 */
export const approveStore = (id) =>
  api.patch(`/admin/stores/${id}/approve`);

/**
 * Reject a store by ID
 * @param {number|string} id
 */
export const rejectStore = (id) =>
  api.patch(`/admin/stores/${id}/reject`);
