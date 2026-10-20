import api from '../../api/axios';

export const getMyStore    = ()         => api.get('/stores/me');
export const createStore   = (data)     => api.post('/stores', data);
export const updateStore   = (data)     => api.put('/stores/me', data);
export const toggleOpen    = (value)    => api.patch('/stores/me/open', null, { params: { value } });
