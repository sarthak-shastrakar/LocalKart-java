import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ShoppingBag,
  ShoppingCart,
  Store,
  Trash2,
  Plus,
  Minus,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Store as StoreIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  fetchCart,
  setCartData,
  emptyCart,
} from '../features/cart/cartSlice';
import {
  updateCartItemQuantity,
  removeCartItem,
  clearCart as clearCartApi,
} from '../features/cart/cartApi';
import { inr } from '../utils';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

export default function CartPage() {
  const dispatch = useDispatch();
  const { data: cart, loading, error } = useSelector((s) => s.cart);

  const [rowLoading, setRowLoading] = useState({}); // { [productId]: 'inc' | 'dec' | 'del' | 'fix' }
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  // ─── Group Items By Store ─────────────────────────────────────────
  const storeGroups = useMemo(() => {
    if (!cart?.items || cart.items.length === 0) return [];
    const map = new Map();
    for (const item of cart.items) {
      const sId = item.storeId ?? 'other';
      if (!map.has(sId)) {
        map.set(sId, {
          storeId: item.storeId,
          storeName: item.storeName || (cart.storeName ?? 'Store'),
          storeOpen: item.storeOpen !== undefined ? item.storeOpen : (cart.storeOpen ?? true),
          items: [],
        });
      }
      map.get(sId).items.push(item);
    }
    return Array.from(map.values());
  }, [cart?.items, cart?.storeName, cart?.storeOpen]);

  // ─── Row Quantity Update ──────────────────────────────────────────
  const handleQuantityChange = async (productId, currentQty, newQty, stock) => {
    if (newQty < 1) {
      handleRemoveItem(productId);
      return;
    }
    const maxQty = Math.min(stock, 20);
    if (newQty > maxQty) {
      toast.error(`Only ${stock} available in stock`);
      return;
    }

    const action = newQty > currentQty ? 'inc' : 'dec';
    setRowLoading((prev) => ({ ...prev, [productId]: action }));

    try {
      const res = await updateCartItemQuantity(productId, newQty);
      dispatch(setCartData(res.data));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update quantity');
    } finally {
      setRowLoading((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    }
  };

  // ─── Row Item Removal ─────────────────────────────────────────────
  const handleRemoveItem = async (productId) => {
    setRowLoading((prev) => ({ ...prev, [productId]: 'del' }));
    try {
      const res = await removeCartItem(productId);
      dispatch(setCartData(res.data));
      toast.success('Item removed from cart');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove item');
    } finally {
      setRowLoading((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    }
  };

  // ─── Fix Unavailable Item ─────────────────────────────────────────
  const handleFixQuantity = async (item) => {
    setRowLoading((prev) => ({ ...prev, [item.productId]: 'fix' }));
    try {
      if (item.stock <= 0) {
        const res = await removeCartItem(item.productId);
        dispatch(setCartData(res.data));
        toast.success(`Removed ${item.name} (out of stock)`);
      } else {
        const targetQty = Math.min(item.stock, item.quantity);
        const res = await updateCartItemQuantity(item.productId, targetQty);
        dispatch(setCartData(res.data));
        toast.success(`Updated ${item.name} quantity to ${targetQty}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to adjust quantity');
    } finally {
      setRowLoading((prev) => {
        const next = { ...prev };
        delete next[item.productId];
        return next;
      });
    }
  };

  // ─── Clear Whole Cart ─────────────────────────────────────────────
  const handleClearCart = async () => {
    setClearLoading(true);
    try {
      await clearCartApi();
      dispatch(setCartData(emptyCart));
      toast.success('Cart cleared');
      setShowClearModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear cart');
    } finally {
      setClearLoading(false);
    }
  };

  // ─── Checkout Click (backend not built yet) ───────────────────────
  const anyStoreClosed = storeGroups.some((g) => !g.storeOpen);
  const checkoutDisabled = cart?.hasUnavailableItems || anyStoreClosed;
  const checkoutHint = anyStoreClosed
    ? 'One or more stores in your cart are currently closed'
    : cart?.hasUnavailableItems
    ? 'Fix unavailable items before proceeding'
    : null;

  const handleProceedToCheckout = () => {
    if (cart.hasUnavailableItems) {
      toast.error('Please fix unavailable items before proceeding to checkout');
      return;
    }
    if (anyStoreClosed) {
      toast.error('One or more stores in your cart are closed right now');
      return;
    }
    toast('Checkout is coming soon', { icon: '🛒' });
  };

  // ─── Loading Skeleton ─────────────────────────────────────────────
  if (loading && (!cart || cart.items.length === 0)) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-16">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  // ─── Error State ──────────────────────────────────────────────────
  if (error && (!cart || cart.items.length === 0)) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle size={28} />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Could not load your cart</h2>
        <p className="text-sm text-gray-500">{error}</p>
        <Button
          type="button"
          onClick={() => dispatch(fetchCart())}
          className="mt-2"
        >
          <RefreshCw size={15} />
          Retry
        </Button>
      </div>
    );
  }

  // ─── Empty Cart State ─────────────────────────────────────────────
  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <EmptyState
          icon={<ShoppingCart size={56} className="text-gray-300 mx-auto stroke-1" />}
          title="Your cart is empty"
          description="Looks like you haven&apos;t added anything to your cart yet."
        />
        <div className="mt-6 flex justify-center">
          <Link to="/">
            <Button type="button" variant="primary" className="gap-2 shadow-sm">
              <StoreIcon size={16} />
              Find stores near you
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-24 md:pb-12 space-y-6">
      {/* Page Title & Clear Cart Bar */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Shopping Cart
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5">
            Your Cart ({cart.totalItems} {cart.totalItems === 1 ? 'item' : 'items'}
            {storeGroups.length > 1 && ` from ${storeGroups.length} stores`})
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setShowClearModal(true)}
          className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 border border-red-200"
        >
          <Trash2 size={13} />
          Clear cart
        </button>
      </div>

      {/* Main Grid: Store-wise Items Groups + Order Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Items Grouped By Store */}
        <div className="lg:col-span-2 space-y-6">
          {storeGroups.map((group, groupIdx) => (
            <div
              key={group.storeId || groupIdx}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Store Header Banner */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50/80 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <Store size={18} className="text-green-600 flex-shrink-0" />
                  {group.storeId ? (
                    <Link
                      to={`/stores/${group.storeId}`}
                      className="font-bold text-gray-800 hover:text-green-700 text-sm sm:text-base transition"
                    >
                      {group.storeName}
                      <span className="text-xs font-normal text-gray-400 ml-1.5 hover:underline">
                        (view store →)
                      </span>
                    </Link>
                  ) : (
                    <span className="font-bold text-gray-800 text-sm sm:text-base">
                      {group.storeName}
                    </span>
                  )}
                </div>

                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    group.storeOpen
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  {group.storeOpen ? '● Open' : '● Closed'}
                </span>
              </div>

              {/* Items in this Store */}
              <div className="p-4 space-y-3 divide-y divide-gray-50">
                {group.items.map((item) => {
                  const rowBusy = Boolean(rowLoading[item.productId]);
                  const isUnavailable = !item.available;
                  const maxQty = Math.min(item.stock, 20);

                  return (
                    <div
                      key={item.productId}
                      className={`pt-3 first:pt-0 flex flex-col sm:flex-row gap-4 sm:items-center justify-between ${
                        isUnavailable ? 'opacity-85' : ''
                      }`}
                    >
                      {/* Left: Product Thumbnail & Info */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0 flex items-center justify-center">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              loading="lazy"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <ShoppingBag size={24} className="text-gray-300" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <h3 className="font-semibold text-sm sm:text-base text-gray-800 truncate">
                            {item.name}
                          </h3>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            <span className="font-medium text-gray-700">{inr(item.unitPrice)}</span>
                            <span>×</span>
                            <span className="text-gray-600">{item.quantity}</span>
                          </div>

                          {/* Stock / Availability warnings */}
                          {isUnavailable && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-md">
                                <AlertTriangle size={12} />
                                {!group.storeOpen
                                  ? 'Store is closed'
                                  : item.stock === 0
                                  ? 'Out of stock'
                                  : `Only ${item.stock} left in stock`}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleFixQuantity(item)}
                                disabled={rowBusy}
                                className="text-xs font-semibold text-green-700 hover:text-green-800 underline underline-offset-2 flex items-center gap-1 transition disabled:opacity-50"
                              >
                                {rowLoading[item.productId] === 'fix' ? (
                                  <Spinner size="sm" />
                                ) : (
                                  'Fix quantity'
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Stepper, Line Total, Trash Button */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0">
                        {/* Stepper */}
                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleQuantityChange(
                                item.productId,
                                item.quantity,
                                item.quantity - 1,
                                item.stock
                              )
                            }
                            disabled={rowBusy}
                            aria-label={
                              item.quantity === 1
                                ? `Remove ${item.name} from cart`
                                : 'Decrease quantity'
                            }
                            className="p-1 rounded-lg text-gray-600 hover:text-green-700 hover:bg-white disabled:opacity-40 transition"
                          >
                            {rowLoading[item.productId] === 'dec' ? (
                              <Spinner size="sm" />
                            ) : item.quantity === 1 ? (
                              <Trash2 size={14} className="text-red-500" />
                            ) : (
                              <Minus size={14} />
                            )}
                          </button>

                          <span
                            className="px-2.5 font-bold text-xs sm:text-sm text-gray-800 select-none min-w-[24px] text-center"
                            aria-live="polite"
                          >
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              handleQuantityChange(
                                item.productId,
                                item.quantity,
                                item.quantity + 1,
                                item.stock
                              )
                            }
                            disabled={rowBusy || item.quantity >= maxQty || !group.storeOpen}
                            aria-label="Increase quantity"
                            className="p-1 rounded-lg text-gray-600 hover:text-green-700 hover:bg-white disabled:opacity-40 transition"
                          >
                            {rowLoading[item.productId] === 'inc' ? (
                              <Spinner size="sm" />
                            ) : (
                              <Plus size={14} />
                            )}
                          </button>
                        </div>

                        {/* Line Total */}
                        <span className="font-bold text-sm sm:text-base text-gray-900 min-w-[70px] text-right">
                          {inr(item.lineTotal)}
                        </span>

                        {/* Direct Remove Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.productId)}
                          disabled={rowBusy}
                          aria-label={`Remove ${item.name} from cart`}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                        >
                          {rowLoading[item.productId] === 'del' ? (
                            <Spinner size="sm" className="border-t-red-600" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Summary Card (Sticky Desktop) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 lg:sticky lg:top-24">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3">
              Order Summary
            </h2>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Total Items</span>
                <span className="font-semibold text-gray-800" aria-live="polite">
                  {cart.totalItems}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Stores</span>
                <span className="font-semibold text-gray-800">
                  {storeGroups.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-gray-900 text-base">
                  {inr(cart.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 pt-1">
                <span>Delivery fee &amp; taxes</span>
                <span>Calculated at checkout</span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-gray-800 text-base">Grand Total</span>
                <span className="text-xl font-extrabold text-green-700">
                  {inr(cart.subtotal)}
                </span>
              </div>

              {checkoutHint && (
                <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-xl flex items-center gap-1.5 font-medium">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  {checkoutHint}
                </p>
              )}

              <Button
                type="button"
                variant="primary"
                onClick={handleProceedToCheckout}
                disabled={checkoutDisabled}
                className="w-full py-3 text-base font-bold shadow-md gap-2"
              >
                <span>Proceed to checkout</span>
                <ArrowRight size={18} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Clear Cart Confirmation Modal */}
      {showClearModal && (
        <Modal
          title="Clear cart?"
          onClose={() => setShowClearModal(false)}
          maxWidth="max-w-sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to remove all items from your cart? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowClearModal(false)}
                disabled={clearLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleClearCart}
                loading={clearLoading}
              >
                Clear cart
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
