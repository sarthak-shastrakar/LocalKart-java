import api from '../../api/axios';

export const loginApi = (data) => api.post('/auth/login', data);
export const registerApi = (data) => api.post('/auth/register', data);
export const getMeApi = () => api.get('/users/me');
export const deleteAccountApi = () => api.delete('/users/me');
