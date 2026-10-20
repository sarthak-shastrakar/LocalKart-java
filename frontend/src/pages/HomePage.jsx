import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  MapPin, Navigation, Search, Clock, ShoppingBag,
  AlertCircle, Package, CheckCircle, ShoppingCart, Sparkles, Store, ChevronDown,
} from 'lucide-react';

import { getNearbyStores } from '../features/stores/storeApi';
import { getAllProducts } from '../features/products/productApi';
import { StoreCardSkeleton, ProductCardSkeleton } from '../components/Skeleton';
import Button from '../components/Button';
import Input from '../components/Input';
import Pagination from '../components/Pagination';
import ProductDetailModal from '../components/ProductDetailModal';
import CardImageCarousel from '../components/CardImageCarousel';
import useGeolocation from '../hooks/useGeolocation';
import useDebounce from '../hooks/useDebounce';
import { categoryBadge, fmtTime, inr } from '../utils';
import { formatDistance } from '../utils/formatDistance';

const RADIUS_OPTIONS = [1, 3, 5, 10];

// ─── Sort options ───────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'nearest',   label: 'Nearest' },
  { value: 'open_first', label: 'Open now first' },
];

// ─── Store card ─────────────────────────────────────────────────
function StoreCard({ store, distanceLabel }) {
  const cat = categoryBadge(store.category);
  const isClosed = !store.open;

  return (
    <Link
      to={`/stores/${store.id}`}
      id={`store-card-${store.id}`}
      state={{ distanceKm: store.distanceKm ?? null }}
      className={`group bg-white rounded-2xl border border-gray-100 shadow-sm
        hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
        overflow-hidden flex flex-col
        ${isClosed ? 'opacity-60' : ''}`}
    >
      {/* Top colour bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-green-400 to-emerald-500" />

      {/* Logo / icon area */}
      <div className="flex items-center gap-4 px-5 pt-5 pb-3">
        {store.logoUrl ? (
          <img
            src={store.logoUrl}
            alt={store.name}
            className="h-14 w-14 rounded-xl object-cover border border-gray-100 flex-shrink-0"
          />
        ) : (
          <div className="h-14 w-14 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="text-green-400" size={24} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-gray-800 text-base truncate group-hover:text-green-700 transition-colors">
            {store.name}
          </h2>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${cat.color}`}>
              {cat.label}
            </span>
            {/* Closed badge */}
            {isClosed && (
              <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-500">
                Closed
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 flex-1 flex flex-col gap-2.5">
        {store.description && (
          <p className="text-sm text-gray-500 line-clamp-2">{store.description}</p>
        )}

        {/* Address */}
        <div className="flex items-start gap-1.5 text-xs text-gray-500">
          <MapPin size={13} className="mt-0.5 flex-shrink-0 text-gray-400" />
          <span className="line-clamp-2">{store.address}, {store.pincode}</span>
        </div>

        {/* Distance badge */}
        {distanceLabel && (
          <div className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 rounded-full px-2.5 py-1 self-start">
            <MapPin size={11} className="flex-shrink-0" />
            <span>{distanceLabel}</span>
          </div>
        )}

        {/* Hours + open badge */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock size={12} />
            <span>
              {store.openTime && store.closeTime
                ? `${fmtTime(store.openTime)} – ${fmtTime(store.closeTime)}`
                : 'Hours not set'}
            </span>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
            ${store.open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
            {store.open ? 'Open' : 'Closed'}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Product card on homepage ────────────────────────────────────
function HomeProductCard({ product, onSelect }) {
  const outOfStock = product.stock === 0;
  const images = product.imageUrls?.length
    ? product.imageUrls
    : product.imageUrl
    ? [product.imageUrl]
    : [];

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
      className={`bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden
        transition-all text-left cursor-pointer group
        ${outOfStock
          ? 'border-gray-100 opacity-70'
          : 'border-gray-100 hover:shadow-md hover:-translate-y-0.5'
        }`}
    >
      {/* Image Carousel */}
      <div className="relative overflow-hidden">
        <CardImageCarousel images={images} alt={product.name} heightClass="h-44" />
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

        <div className="flex items-center gap-2 mt-auto pt-2">
          {product.category && (
            <span className="text-xs text-gray-500 bg-gray-50 rounded-full px-2 py-0.5">
              {product.category}
            </span>
          )}
        </div>

        <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
          <span className="text-base font-bold text-green-700">{inr(product.price)}</span>
          {!outOfStock && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <CheckCircle size={11} className="text-green-400" />
              {product.stock} left
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(product);
          }}
          className="w-full mt-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold
            bg-green-50 text-green-700 hover:bg-green-100 transition-colors border border-green-200"
        >
          <ShoppingCart size={14} />
          View Details
        </button>
      </div>
    </div>
  );
}

// ─── Main Homepage ───────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate();
  const { user, token } = useSelector((s) => s.auth);
  const isLoggedIn = Boolean(user || token);

  const [activeTab, setActiveTab] = useState('products');
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Products state
  const [products, setProducts] = useState(null);
  const [prodLoading, setProdLoading] = useState(false);
  const [prodPage, setProdPage] = useState(0);
  const [prodTotalPages, setProdTotalPages] = useState(0);
  const [prodTotalItems, setProdTotalItems] = useState(0);
  const [prodQuery, setProdQuery] = useState('');
  const debouncedProdQuery = useDebounce(prodQuery, 400);

  // Stores state
  const { position, loading: geoLoading, error: geoError, getPosition } = useGeolocation();
  const [stores, setStores] = useState(null);
  const [storesLoading, setStoresLoading] = useState(false);
  const [storesError, setStoresError] = useState(null);
  const [radius, setRadius] = useState(5);
  const [manualLat, setManualLat] = useState('21.1458');
  const [manualLng, setManualLng] = useState('79.0882');

  // Sort
  const [storeSort, setStoreSort] = useState('nearest');

  // Sorted stores (client-side only, API order preserved as base)
  const sortedStores = useMemo(() => {
    if (!stores) return stores;
    if (storeSort === 'open_first') {
      // Stable sort: open stores first, preserve relative distance order within each group
      return [...stores].sort((a, b) => {
        if (a.open === b.open) return 0;
        return a.open ? -1 : 1;
      });
    }
    // 'nearest' → keep API order (already sorted nearest-first by backend)
    return stores;
  }, [stores, storeSort]);

  // Next radius option for the "Try X km" empty-state button
  const nextRadius = useMemo(() => {
    const idx = RADIUS_OPTIONS.indexOf(radius);
    return idx < RADIUS_OPTIONS.length - 1 ? RADIUS_OPTIONS[idx + 1] : null;
  }, [radius]);

  // ── Fetch products ───────────────────────────────────────────
  const fetchProducts = useCallback(async (query, page) => {
    setProdLoading(true);
    try {
      const res = await getAllProducts({ q: query, page, size: 12 });
      setProducts(res.data.items || []);
      setProdTotalPages(res.data.totalPages || 0);
      setProdTotalItems(res.data.totalItems || 0);
    } catch {
      setProducts([]);
    } finally {
      setProdLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(debouncedProdQuery, prodPage); }, [debouncedProdQuery, prodPage, fetchProducts]);
  useEffect(() => { setProdPage(0); }, [debouncedProdQuery]);

  // ── Fetch nearby stores ──────────────────────────────────────
  const fetchStores = useCallback(async (lat, lng, r) => {
    setStoresLoading(true);
    setStoresError(null);
    try {
      const res = await getNearbyStores(lat, lng, r);
      setStores(res.data);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not fetch nearby stores.';
      setStoresError(msg);
      toast.error(msg);
    } finally {
      setStoresLoading(false);
    }
  }, []);

  useEffect(() => {
    if (position) {
      fetchStores(position.lat, position.lng, radius);
    } else {
      fetchStores(parseFloat(manualLat), parseFloat(manualLng), radius);
    }
  }, [position]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUseLocation = () => getPosition();

  const handleManualSearch = (e) => {
    e.preventDefault();
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error('Please enter valid latitude and longitude.');
      return;
    }
    fetchStores(lat, lng, radius);
  };

  const handleRadiusChange = (r) => {
    setRadius(r);
    const lat = position?.lat ?? parseFloat(manualLat);
    const lng = position?.lng ?? parseFloat(manualLng);
    if (!isNaN(lat) && !isNaN(lng)) fetchStores(lat, lng, r);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Banner - only shown for guests / before login */}
      {!isLoggedIn && (
        <div className="rounded-3xl bg-gradient-to-br from-green-600 via-emerald-700 to-teal-800 text-white px-8 py-10 relative overflow-hidden shadow-lg">
          <div
            className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, white 0%, transparent 60%)' }}
          />
          <div className="relative z-10 max-w-xl space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-semibold">
              <Sparkles size={14} className="text-amber-300" />
              <span>Discover Local Products &amp; Stores</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
              Shop fresh from your local kirana &amp; stores 🛍️
            </h1>
            <p className="text-green-100 text-sm sm:text-base">
              Explore products added by neighbourhood vendors or find stores near you.
            </p>

            {/* Quick tab toggle inside Hero */}
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition shadow-sm
                  ${activeTab === 'products'
                    ? 'bg-white text-green-800 shadow-md'
                    : 'bg-white/15 text-white hover:bg-white/25 border border-white/20'}`}
              >
                <Package size={17} />
                Explore Products {prodTotalItems > 0 && `(${prodTotalItems})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('stores')}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition shadow-sm
                  ${activeTab === 'stores'
                    ? 'bg-white text-green-800 shadow-md'
                    : 'bg-white/15 text-white hover:bg-white/25 border border-white/20'}`}
              >
                <Store size={17} />
                Nearby Stores
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`pb-2 px-3 text-sm font-bold transition-colors border-b-2 -mb-2.5 flex items-center gap-2
              ${activeTab === 'products'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            <Package size={16} />
            All Products
            {prodTotalItems > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                {prodTotalItems}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stores')}
            className={`pb-2 px-3 text-sm font-bold transition-colors border-b-2 -mb-2.5 flex items-center gap-2
              ${activeTab === 'stores'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            <Store size={16} />
            Nearby Stores
          </button>
        </div>
      </div>

      {/* ── TAB 1: PRODUCTS ─────────────────────────────── */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                id="homepage-product-search"
                type="search"
                placeholder="Search products by name…"
                value={prodQuery}
                onChange={(e) => setProdQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder:text-gray-400 shadow-sm"
              />
            </div>
            {prodTotalItems > 0 && (
              <p className="text-xs text-gray-500 font-medium">
                Showing <span className="font-bold text-gray-800">{prodTotalItems}</span> product{prodTotalItems !== 1 ? 's' : ''} from local stores
              </p>
            )}
          </div>

          {prodLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          )}

          {!prodLoading && products !== null && products.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <Package size={48} className="text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-500">
                {prodQuery ? `No products matching "${prodQuery}"` : 'No products available yet'}
              </h3>
              <p className="text-sm text-gray-400 max-w-xs">
                {prodQuery ? 'Try searching for something else.' : "Approved stores haven't uploaded items yet. Check back soon!"}
              </p>
            </div>
          )}

          {!prodLoading && products && products.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((p) => (
                  <HomeProductCard key={p.id} product={p} onSelect={setSelectedProduct} />
                ))}
              </div>
              {prodTotalPages > 1 && (
                <Pagination page={prodPage} totalPages={prodTotalPages} onPageChange={setProdPage} />
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB 2: NEARBY STORES ────────────────────────── */}
      {activeTab === 'stores' && (
        <div className="space-y-6">
          {/* Controls row */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            {/* Manual lat/lng */}
            <form onSubmit={handleManualSearch} className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="flex gap-2 flex-1">
                <Input
                  id="manual-lat"
                  label="Latitude"
                  type="number"
                  step="any"
                  placeholder="21.1458"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  className="flex-1"
                />
                <Input
                  id="manual-lng"
                  label="Longitude"
                  type="number"
                  step="any"
                  placeholder="79.0882"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  className="flex-1"
                />
              </div>
              <Button
                id="manual-search-btn"
                type="submit"
                variant="secondary"
                className="self-end sm:self-auto whitespace-nowrap"
              >
                <Search size={15} />
                Search
              </Button>
            </form>

            {/* Radius selector */}
            <div className="space-y-1.5 shrink-0">
              <label className="block text-sm font-medium text-gray-700">Radius</label>
              <div className="flex gap-1.5">
                {RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    id={`radius-${r}km-btn`}
                    type="button"
                    onClick={() => handleRadiusChange(r)}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all border
                      ${radius === r
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-600'}`}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* GPS / error row */}
          <div className="flex items-center gap-3">
            <Button
              id="use-location-btn"
              onClick={handleUseLocation}
              loading={geoLoading}
              variant="outline"
              className="text-xs text-green-700 border-green-300 hover:bg-green-50 gap-1.5"
            >
              <Navigation size={13} />
              Use My Current GPS Location
            </Button>
            {geoError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} /> {geoError}
              </p>
            )}
          </div>

          {/* Result count + sort controls */}
          {!storesLoading && sortedStores && sortedStores.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Result count */}
              <p id="stores-result-count" className="text-sm text-gray-600 font-medium">
                <span className="font-bold text-gray-800">{sortedStores.length}</span>
                {' '}store{sortedStores.length !== 1 ? 's' : ''} within{' '}
                <span className="font-semibold">{radius} km</span>
              </p>

              {/* Sort dropdown */}
              <div className="flex items-center gap-2">
                <label htmlFor="store-sort-select" className="text-xs text-gray-500 whitespace-nowrap">
                  Sort by:
                </label>
                <div className="relative">
                  <select
                    id="store-sort-select"
                    value={storeSort}
                    onChange={(e) => setStoreSort(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-gray-200 text-sm font-medium
                      text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-400 cursor-pointer"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {storesLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <StoreCardSkeleton key={i} />)}
            </div>
          )}

          {/* Error state */}
          {!storesLoading && storesError && stores === null && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <AlertCircle size={48} className="text-red-300" />
              <h3 className="text-lg font-semibold text-gray-500">Failed to load stores</h3>
              <p className="text-sm text-gray-400 max-w-xs">{storesError}</p>
              <button
                type="button"
                onClick={() => {
                  const lat = position?.lat ?? parseFloat(manualLat);
                  const lng = position?.lng ?? parseFloat(manualLng);
                  fetchStores(lat, lng, radius);
                }}
                className="text-sm text-green-600 font-semibold hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Prompt: user hasn't searched yet */}
          {!storesLoading && !storesError && stores === null && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <Navigation size={48} className="text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-500">Find your nearby stores</h3>
              <p className="text-sm text-gray-400 max-w-xs">
                Click &ldquo;Use My Current GPS Location&rdquo; or search coordinates above.
              </p>
            </div>
          )}

          {/* Empty state: search returned 0 results */}
          {!storesLoading && !storesError && stores !== null && stores.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <ShoppingBag size={48} className="text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-500">
                No stores within {radius} km
              </h3>
              <p className="text-sm text-gray-400 max-w-xs">
                We couldn&#39;t find any approved stores in this area. Try a larger radius.
              </p>
              {nextRadius && (
                <button
                  id="try-larger-radius-btn"
                  type="button"
                  onClick={() => handleRadiusChange(nextRadius)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold
                    hover:bg-green-700 transition-colors shadow-sm"
                >
                  Try {nextRadius} km
                </button>
              )}
            </div>
          )}

          {/* Stores grid */}
          {!storesLoading && !storesError && sortedStores && sortedStores.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedStores.map((s) => (
                <StoreCard
                  key={s.id}
                  store={s}
                  distanceLabel={formatDistance(s.distanceKm)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shared Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
