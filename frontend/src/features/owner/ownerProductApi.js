import api from '../../api/axios';

export const getMyProducts  = (params)           => api.get('/owner/products', { params });
export const createProduct  = (data)             => api.post('/owner/products', data);
export const updateProduct  = (id, data)         => api.put(`/owner/products/${id}`, data);
export const updateStock    = (id, value)        => api.patch(`/owner/products/${id}/stock`, null, { params: { value } });
export const deleteProduct  = (id)              => api.delete(`/owner/products/${id}`);
