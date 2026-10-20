import api from '../../api/axios';

export const getNearbyStores = (lat, lng, radius) =>
  api.get('/stores/nearby', { params: { lat, lng, radius } });

export const getStoreById = (id) => api.get(`/stores/${id}`);
