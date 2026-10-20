import api from '../../api/axios';

/**
 * Fetch paginated users list with optional role or search query filter
 * @param {object} params - { role, q, page, size }
 */
export const getUsers = (params = {}) => {
  const cleanedParams = {};
  if (params.role) cleanedParams.role = params.role;
  if (params.q && params.q.trim()) cleanedParams.q = params.q.trim();
  cleanedParams.page = params.page ?? 0;
  cleanedParams.size = params.size ?? 10;

  return api.get('/admin/users', { params: cleanedParams });
};

/**
 * Block a user (sets enabled = false)
 * @param {number|string} id
 * @param {object} [data] - { reason, note }
 */
export const blockUser = (id, data) =>
  api.patch(`/admin/users/${id}/block`, data);

/**
 * Unblock a user (sets enabled = true)
 * @param {number|string} id
 */
export const unblockUser = (id) =>
  api.patch(`/admin/users/${id}/unblock`);
