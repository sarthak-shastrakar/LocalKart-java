import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { inr } from '../utils';
import CartItemControls from './CartItemControls';

/**
 * Product detail modal with image gallery, keyboard navigation, and swipe support.
 */
export default function ProductDetailModal({ product, onClose, store }) {
  const images = product.imageUrls?.length ? product.imageUrls : (product.imageUrl ? [product.imageUrl] : []);
  const [activeIdx, setActiveIdx] = useState(0);
  const overlayRef = useRef(null);
  const touchStartX = useRef(null);

  const outOfStock = product.stock === 0;

  const goNext = useCallback(() => {
    if (images.length > 1) setActiveIdx((i) => (i + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    if (images.length > 1) setActiveIdx((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose, goNext, goPrev]);

  // Swipe support
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? goNext() : goPrev();
    }
    touchStartX.current = null;
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 truncate pr-4">{product.name}</h2>
          <button
            onClick={onClose}
            aria-label="Close product detail"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto">
          {/* Gallery */}
          {images.length > 0 ? (
            <div className="relative bg-gray-50">
              {/* Main image */}
              <div
                className="relative aspect-[4/3] overflow-hidden"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <img
                  src={images[activeIdx]}
                  alt={`${product.name} – photo ${activeIdx + 1}`}
                  loading="lazy"
                  className="w-full h-full object-contain bg-gray-50"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                  }}
                />

                {/* Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={goPrev}
                      aria-label="Previous photo"
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 text-gray-700 hover:bg-white shadow transition"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={goNext}
                      aria-label="Next photo"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 text-gray-700 hover:bg-white shadow transition"
                    >
                      <ChevronRight size={20} />
                    </button>
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/50 text-white text-xs font-medium">
                      {activeIdx + 1} / {images.length}
                    </span>
                  </>
                )}
              </div>

              {/* Thumbnail strip */}
              {images.length > 1 && (
                <div className="flex gap-2 px-4 py-3 overflow-x-auto">
                  {images.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveIdx(i)}
                      aria-label={`View photo ${i + 1}`}
                      className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition
                        ${i === activeIdx ? 'border-green-500 ring-1 ring-green-300' : 'border-transparent opacity-60 hover:opacity-100'}
                      `}
                    >
                      <img
                        src={url}
                        alt={`Thumbnail ${i + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.onerror = null; e.target.src = ''; }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
              <Package className="text-gray-300" size={64} />
            </div>
          )}

          {/* Product info */}
          <div className="p-5 space-y-4">
            {/* Price & stock */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-2xl font-bold text-green-700">{inr(product.price)}</span>
              {outOfStock ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                  <AlertTriangle size={13} /> Out of stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                  <CheckCircle size={13} /> {product.stock} in stock
                </span>
              )}
            </div>

            {/* Category */}
            {product.category && (
              <span className="inline-block text-xs text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5">
                {product.category}
              </span>
            )}

            {/* Description */}
            {product.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
            )}

            {/* Add to cart / Stepper controls */}
            <div className="pt-1">
              <CartItemControls product={product} store={store} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
