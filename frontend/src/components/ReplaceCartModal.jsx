import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import Modal from './Modal';
import Button from './Button';
import { closeReplaceModal, setCartData } from '../features/cart/cartSlice';
import { addToCart } from '../features/cart/cartApi';

export default function ReplaceCartModal() {
  const dispatch = useDispatch();
  const { isOpen, pendingItem, currentStoreName } = useSelector((s) => s.cart.replaceModal);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !pendingItem) return null;

  const handleKeep = () => {
    dispatch(closeReplaceModal());
  };

  const handleClearAndAdd = async () => {
    setLoading(true);
    try {
      const res = await addToCart({
        productId: pendingItem.productId,
        quantity: pendingItem.quantity ?? 1,
        replace: true,
      });
      dispatch(setCartData(res.data));
      toast.success('Cart updated');
      dispatch(closeReplaceModal());
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update cart');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Start a new cart?" onClose={handleKeep} maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          Your cart has items from <span className="font-semibold text-gray-800">{currentStoreName}</span>. Adding this item will clear it.
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleKeep}
            disabled={loading}
          >
            Keep my cart
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleClearAndAdd}
            loading={loading}
          >
            Clear and add
          </Button>
        </div>
      </div>
    </Modal>
  );
}
