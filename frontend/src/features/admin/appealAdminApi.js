import api from '../../api/axios';

/**
 * Get paginated list of appeals (Admin only)
 * @param {object} params - { status, mine, page, size }
 */
export const getAppeals = (params = {}) => {
  const cleanedParams = {};
  if (params.status) cleanedParams.status = params.status;
  if (params.mine !== undefined) cleanedParams.mine = params.mine;
  cleanedParams.page = params.page ?? 0;
  cleanedParams.size = params.size ?? 10;

  return api.get('/admin/appeals', { params: cleanedParams });
};

/**
 * Get pending appeals count for badges (Admin only)
 * returns { mine: number, all: number }
 */
export const getPendingAppealCounts = () =>
  api.get('/admin/appeals/pending-count');

/**
 * Approve an appeal and unblock the user (Admin only)
 * @param {number|string} id
 * @param {object} [data] - { note }
 */
export const approveAppeal = (id, data = {}) =>
  api.patch(`/admin/appeals/${id}/approve`, data);

/**
 * Reject an appeal (Admin only, note is required)
 * @param {number|string} id
 * @param {object} data - { note }
 */
export const rejectAppeal = (id, data) =>
  api.patch(`/admin/appeals/${id}/reject`, data);
