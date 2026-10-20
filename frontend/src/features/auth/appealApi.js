import api from '../../api/axios';

/**
 * Submit an unblock appeal (public, blocked users)
 * @param {object} data - { email, password, message }
 */
export const submitAppeal = (data) =>
  api.post('/auth/appeals', data);

/**
 * Check appeal status (public, blocked users)
 * @param {object} data - { email, password }
 */
export const getAppealStatus = (data) =>
  api.post('/auth/appeals/status', data);
