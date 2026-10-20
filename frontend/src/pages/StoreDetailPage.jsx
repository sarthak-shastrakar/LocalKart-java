import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  MapPin, Clock, Store, Search, Package,
  ShoppingCart, AlertTriangle, ArrowLeft, CheckCircle,
} from 'lucide-react';

import { getStoreById } from '../features/stores/storeApi';
import { getStoreProducts } from '../features/products/productApi';
import { ProductCardSkeleton } from '../components/Skeleton';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import Spinner from '../components/Spinner';
import ProductDetailModal from '../components/ProductDetailModal';
import CardImageCarousel from '../components/CardImageCarousel';
import useDebounce from '../hooks/useDebounce';
import { inr, fmtTime, categoryBadge } from '../utils';
import { formatDistance } from '../utils/formatDistance';

/* ─── Store header ─────────────────────────────────── */
function StoreHeader({ store, distanceLabel }) {
  const cat = categoryBadge(store.category);
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Banner strip */}
      <div className="h-2 w-full bg-gradient-to-r from-green-400 to-emerald-500" />

      <div className="p-6 flex flex-col sm:flex-row gap-5 items-start">
        {/* Logo */}
        {store.logoUrl ? (
          <img
            src={store.logoUrl}
            alt={store.name}
            className="h-20 w-20 rounded-2xl object-cover border border-gray-100 flex-shrink-0"
          />
        ) : (
          <div className="h-20 w-20 rounded-2xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <Store className="text-green-400" size={32} />
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-800">{store.name}</h1>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cat.color}`}>
              {cat.label}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full
              ${store.open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
              {store.open ? '● Open' : '● Closed'}
            </span>
          </div>

          {store.description && (
            <p className="text-sm text-gray-500">{store.description}</p>
          )}

          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <MapPin size={13} className="text-gray-400" />
              {store.address}, {store.pincode}
            </span>
            {store.openTime && store.closeTime && (
              <span className="flex items-center gap-1.5">
                <Clock size={13} className="text-gray-400" />
                {fmtTime(store.openTime)} – {fmtTime(store.closeTime)}
              </span>
            )}
            {/* Distance badge – only shown when navigating from Nearby Stores */}
            {distanceLabel && (
              <span className="flex items-center gap-1 font-semibold text-green-700 bg-green-50 rounded-full px-2.5 py-0.5">
                <MapPin size={11} className="flex-shrink-0" />
                {distanceLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import CartItemControls from '../components/CartItemControls';

/* ─── Product card ─────────────────────────────────── */
function ProductCard({ product, onSelect, store }) {
  const outOfStock = product.stock === 0;
  const images = product.imageUrls?.length ? product.imageUrls : (product.imageUrl ? [product.imageUrl] : []);

  return (
    <div
      onClick={() => onSelect(product)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(product);
        }
      }}
      className={`bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden transition-all text-left cursor-pointer group
      ${outOfStock ? 'border-gray-100 opacity-70' : 'border-gray-100 hover:shadow-md hover:-translate-y-0.5'}
    `}>
      {/* Image Carousel */}
      <div className="relative overflow-hidden">
        <CardImageCarousel
          images={images}
          alt={product.name}
          heightClass="h-40"
        />

        {outOfStock && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-20 pointer-events-none">
            <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-semibold text-gray-800 text-sm line-clamp-2 leading-snug group-hover:text-green-700 transition-colors">
          {product.name}
        </h3>

        {product.description && (
          <p className="text-xs text-gray-400 line-clamp-2">{product.description}</p>
        )}

        {product.category && (
          <span className="text-xs text-gray-400 bg-gray-50 rounded-full px-2 py-0.5 self-start">
            {product.category}
          </span>
        )}

        <div className="mt-auto pt-2 border-t border-gray-50 flex items-center justify-between">
          <span className="text-base font-bold text-green-700">{inr(product.price)}</span>
          {!outOfStock && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <CheckCircle size={11} className="text-green-400" />
              {product.stock} left
            </span>
          )}
        </div>

        {/* Working Add to cart / Stepper */}
        <div onClick={(e) => e.stopPropagation()} className="mt-1">
          <CartItemControls product={product} store={store} />
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ────────────────────────────────────── */
export default function StoreDetailPage() {
  const { storeId } = useParams();
  const location = useLocation();
  // distanceKm is passed via router state when navigating from the Nearby Stores tab
  const distanceLabel = formatDistance(location.state?.distanceKm ?? null);

  const [store, setStore] = useState(null);
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeError, setStoreError] = useState(null);

  const [products, setProducts] = useState(null);
  const [prodLoading, setProdLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const [selectedProduct, setSelectedProduct] = useState(null);

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);

  // Load store
  useEffect(() => {
    setStoreLoading(true);
    setStoreError(null);
    getStoreById(storeId)
      .then((res) => setStore(res.data))
      .catch((err) => {
        const msg = err.response?.data?.message || 'Store not found or not available.';
        setStoreError(msg);
      })
      .finally(() => setStoreLoading(false));
  }, [storeId]);

  // Load products (re-runs on debounced query or page change)
  useEffect(() => {
    setProdLoading(true);
    getStoreProducts(storeId, { q: debouncedQuery, page, size: 12 })
      .then((res) => {
        setProducts(res.data.items);
        setTotalPages(res.data.totalPages);
        setTotalItems(res.data.totalItems);
      })
      .catch(() => setProducts([]))
      .finally(() => setProdLoading(false));
  }, [storeId, debouncedQuery, page]);

  // Reset to page 0 when query changes
  useEffect(() => { setPage(0); }, [debouncedQuery]);

  /* ── Store loading / error states ── */
  if (storeLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (storeError) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <AlertTriangle size={48} className="text-amber-400" />
        <p className="text-gray-600 font-medium">{storeError}</p>
        <Link to="/" className="text-sm text-green-600 hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 transition-colors font-medium">
        <ArrowLeft size={15} /> All stores
      </Link>

      {/* Store header card */}
      <StoreHeader store={store} distanceLabel={distanceLabel} />

      {/* Products section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-800">
            Products
            {totalItems > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">({totalItems})</span>
            )}
          </h2>

          {/* Search */}
          <div className="relative sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              id="product-search-input"
              type="search"
              placeholder="Search products…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search products"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Product grid */}
        {prodLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        )}

        {!prodLoading && products !== null && products.length === 0 && (
          <EmptyState
            icon={<Package size={48} className="text-gray-300 mx-auto" />}
            title={query ? `No products matching "${query}"` : 'No products yet'}
            description={query ? 'Try a different search term.' : 'This store hasn\'t added any products yet.'}
          />
        )}

        {!prodLoading && products && products.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  store={store}
                  onSelect={setSelectedProduct}
                />
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          store={store}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
