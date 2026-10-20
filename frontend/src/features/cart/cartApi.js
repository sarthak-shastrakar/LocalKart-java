import api from '../../api/axios';

/**
 * Backend cart endpoints (CUSTOMER role only)
 */

export const getCart = () => api.get('/cart');

export const addToCart = ({ productId, quantity = 1, replace = false }) =>
  api.post('/cart/items', { productId, quantity, replace });

export const updateCartItemQuantity = (productId, quantity) =>
  api.patch(`/cart/items/${productId}?quantity=${quantity}`);

export const removeCartItem = (productId) =>
  api.delete(`/cart/items/${productId}`);

export const clearCart = () =>
  api.delete('/cart');
