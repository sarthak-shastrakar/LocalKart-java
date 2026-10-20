import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Spinner from './Spinner';
import { addToCart, updateCartItemQuantity, removeCartItem } from '../features/cart/cartApi';
import { setCartData, openReplaceModal } from '../features/cart/cartSlice';

/**
 * Reusable Add to Cart / Quantity Stepper button.
 *
 * @param {object} props
 * @param {object} props.product - product object { id, name, stock, ... }
 * @param {object} [props.store] - optional store object { id, open, name, ... }
 * @param {boolean} [props.isStoreOpen] - optional explicit store open status
 * @param {string} [props.className] - additional classes
 * @param {boolean} [props.compact] - compact mode
 */
export default function CartItemControls({
  product,
  store,
  isStoreOpen,
  className = '',
  compact = false,
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { user, token } = useSelector((s) => s.auth);
  const cart = useSelector((s) => s.cart.data);

  const [loadingAction, setLoadingAction] = useState(null); // 'add' | 'inc' | 'dec'

  // Logged in as STORE_OWNER or ADMIN -> hide controls or show note
  if (user && (user.role === 'STORE_OWNER' || user.role === 'ADMIN')) {
    return (
      <div className={`text-center py-1.5 ${className}`}>
        <p className="text-xs text-gray-400 italic">Switch to a customer account to order</p>
      </div>
    );
  }

  // Determine if store is open
  const storeOpen =
    isStoreOpen !== undefined
      ? isStoreOpen
      : store?.open !== undefined
      ? store.open
      : product.store?.open !== undefined
      ? product.store.open
      : cart.storeId === product.storeId
      ? cart.storeOpen
      : true;

  const outOfStock = product.stock <= 0;
  const cartItem = cart?.items?.find((i) => i.productId === product.id);

  // ─── Add to Cart Handler ──────────────────────────────────────────
  const handleAdd = async (e) => {
    e.stopPropagation();

    if (!token || !user) {
      toast('Please log in to add items');
      navigate('/login', { state: { from: location } });
      return;
    }

    if (outOfStock || !storeOpen) return;

    setLoadingAction('add');
    try {
      const res = await addToCart({
        productId: product.id,
        quantity: 1,
        replace: false,
      });
      dispatch(setCartData(res.data));
      toast.success('Added to cart');
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || 'Failed to add item to cart';
      if (status === 409 && msg.startsWith('Your cart has items from another store')) {
        dispatch(
          openReplaceModal({
            pendingItem: { productId: product.id, quantity: 1 },
            currentStoreName: cart.storeName,
          })
        );
      } else {
        toast.error(msg);
      }
    } finally {
      setLoadingAction(null);
    }
  };

  // ─── Stepper: Decrement / Remove ──────────────────────────────────
  const handleDecrement = async (e) => {
    e.stopPropagation();
    if (!cartItem) return;

    setLoadingAction('dec');
    try {
      if (cartItem.quantity <= 1) {
        const res = await removeCartItem(product.id);
        dispatch(setCartData(res.data));
      } else {
        const res = await updateCartItemQuantity(product.id, cartItem.quantity - 1);
        dispatch(setCartData(res.data));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update quantity');
    } finally {
      setLoadingAction(null);
    }
  };

  // ─── Stepper: Increment ───────────────────────────────────────────
  const handleIncrement = async (e) => {
    e.stopPropagation();
    if (!cartItem) return;

    const maxQty = Math.min(product.stock, 20);
    if (cartItem.quantity >= maxQty) {
      toast.error(`Only ${product.stock} available in stock`);
      return;
    }

    setLoadingAction('inc');
    try {
      const res = await updateCartItemQuantity(product.id, cartItem.quantity + 1);
      dispatch(setCartData(res.data));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update quantity');
    } finally {
      setLoadingAction(null);
    }
  };

  // ─── Render Stepper if in Cart ─────────────────────────────────────
  if (cartItem) {
    const maxQty = Math.min(product.stock, 20);
    const plusDisabled = cartItem.quantity >= maxQty || loadingAction !== null || !storeOpen;
    const minusDisabled = loadingAction !== null;

    return (
      <div
        className={`flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-1 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleDecrement}
          disabled={minusDisabled}
          aria-label={cartItem.quantity === 1 ? `Remove ${product.name} from cart` : 'Decrease quantity'}
          className="p-1.5 rounded-lg text-green-700 hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed transition focus:outline-none focus:ring-1 focus:ring-green-400"
        >
          {loadingAction === 'dec' ? (
            <Spinner size="sm" className="border-t-green-700" />
          ) : cartItem.quantity === 1 ? (
            <Trash2 size={15} />
          ) : (
            <Minus size={15} />
          )}
        </button>

        <span
          className="font-bold text-sm text-green-800 px-3 select-none"
          aria-live="polite"
        >
          {cartItem.quantity}
        </span>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={plusDisabled}
          aria-label="Increase quantity"
          className="p-1.5 rounded-lg text-green-700 hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed transition focus:outline-none focus:ring-1 focus:ring-green-400"
        >
          {loadingAction === 'inc' ? (
            <Spinner size="sm" className="border-t-green-700" />
          ) : (
            <Plus size={15} />
          )}
        </button>
      </div>
    );
  }

  // ─── Render Add to Cart Button ────────────────────────────────────
  const disabled = outOfStock || !storeOpen || loadingAction !== null;
  const label = outOfStock
    ? 'Out of stock'
    : !storeOpen
    ? 'Store closed'
    : 'Add to cart';

  return (
    <button
      id={`add-to-cart-${product.id}`}
      type="button"
      onClick={handleAdd}
      disabled={disabled}
      aria-label={`${label} - ${product.name}`}
      className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-1 ${
        disabled
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
          : 'bg-green-600 text-white hover:bg-green-700 shadow-sm active:scale-[0.98]'
      } ${className}`}
    >
      {loadingAction === 'add' ? (
        <Spinner size="sm" className="border-t-white" />
      ) : (
        <ShoppingCart size={15} />
      )}
      <span>{label}</span>
    </button>
  );
}
