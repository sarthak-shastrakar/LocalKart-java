import api from '../../api/axios';

export const loginApi          = (data) => api.post('/auth/login', data);
export const registerApi       = (data) => api.post('/auth/register', data);
export const refreshApi        = ()     => api.post('/auth/refresh');
export const logoutApi         = ()     => api.post('/auth/logout');
export const deleteSessionsApi = ()     => api.delete('/users/me/sessions');
export const getMeApi          = ()     => api.get('/users/me');
export const deleteAccountApi  = (password) =>
  api.delete('/users/me', {
    data: typeof password === 'object' && password !== null ? password : { password },
  });
