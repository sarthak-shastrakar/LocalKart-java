import api from '../../api/axios';

export const getStoreProducts = (storeId, params) =>
  api.get(`/stores/${storeId}/products`, { params });

export const getAllProducts = (params) =>
  api.get('/products', { params });
