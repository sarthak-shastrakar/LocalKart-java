import api from '../../api/axios';

/**
 * Upload a single image file (product or store).
 * @param {File} file
 * @param {'product'|'store'} type
 * @returns {Promise<import('axios').AxiosResponse<{url: string, publicId: string}>>}
 */
export const uploadImage = (file, type) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post(`/uploads/image?type=${type}`, fd);
};

/**
 * Upload profile photo for the logged-in user.
 * @param {File} file
 */
export const uploadProfilePhoto = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/users/me/photo', fd);
};

/**
 * Remove profile photo for the logged-in user.
 */
export const deleteProfilePhoto = () => api.delete('/users/me/photo');
