import { useState, useEffect, useRef, useCallback } from 'react';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=60';

/**
 * Reusable auto-scrolling image carousel for product cards.
 * Automatically cycles through all images for the given card,
 * with smooth slide transitions, dot indicators, and optional manual chevrons.
 */
export default function CardImageCarousel({
  images = [],
  alt = 'Product image',
  heightClass = 'h-44',
  interval = 2800,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef(null);
  const touchStartX = useRef(null);

  // Normalize images array
  const validImages = Array.isArray(images)
    ? images.filter((img) => typeof img === 'string' && img.trim().length > 0)
    : [];
  const total = validImages.length;

  // Clear timer helper
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Setup auto-scroll interval
  const startTimer = useCallback(() => {
    clearTimer();
    if (total > 1) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % total);
      }, interval);
    }
  }, [clearTimer, total, interval]);

  useEffect(() => {
    startTimer();
    return () => clearTimer();
  }, [startTimer, clearTimer]);

  // Handle manual navigation
  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + total) % total);
    startTimer();
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % total);
    startTimer();
  };

  const handleDotClick = (e, idx) => {
    e.stopPropagation();
    setCurrentIndex(idx);
    startTimer();
  };

  // Touch swipe support
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext(e);
      } else {
        handlePrev(e);
      }
    }
    touchStartX.current = null;
  };

  // Case 1: No images -> render placeholder
  if (total === 0) {
    return (
      <div className={`${heightClass} w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center`}>
        <Package className="text-gray-300" size={36} />
      </div>
    );
  }

  // Case 2: Exactly 1 image -> static image without carousel controls
  if (total === 1) {
    return (
      <div className={`relative overflow-hidden ${heightClass} w-full bg-gray-50`}>
        <img
          src={validImages[0]}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = FALLBACK_IMG;
          }}
        />
      </div>
    );
  }

  // Case 3: Multiple images -> auto-scrolling carousel
  return (
    <div
      className={`relative overflow-hidden ${heightClass} w-full bg-gray-50 select-none group/carousel`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sliding track */}
      <div
        className="flex h-full w-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {validImages.map((src, idx) => (
          <div key={idx} className="h-full w-full flex-shrink-0 relative overflow-hidden">
            <img
              src={src}
              alt={`${alt} ${idx + 1}`}
              loading="lazy"
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = FALLBACK_IMG;
              }}
            />
          </div>
        ))}
      </div>

      {/* Counter Badge at top-right */}
      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-semibold tracking-wider backdrop-blur-sm shadow z-10 pointer-events-none">
        {currentIndex + 1}/{total}
      </span>

      {/* Manual chevrons on card hover */}
      <button
        type="button"
        onClick={handlePrev}
        className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow"
        title="Previous image"
      >
        <ChevronLeft size={14} />
      </button>
      <button
        type="button"
        onClick={handleNext}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow"
        title="Next image"
      >
        <ChevronRight size={14} />
      </button>

      {/* Dot Indicators at bottom */}
      <div className="absolute bottom-2 left-0 right-0 flex justify-center items-center gap-1.5 z-10 pointer-events-auto">
        {validImages.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={(e) => handleDotClick(e, idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === currentIndex
                ? 'w-4 bg-white shadow'
                : 'w-1.5 bg-white/60 hover:bg-white/90'
            }`}
            aria-label={`Go to image ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
