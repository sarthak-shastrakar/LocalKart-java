/**
 * LocationPicker
 *
 * Self-contained component that:
 *  - Shows an address search box with Nominatim suggestions (debounced 500 ms)
 *  - Shows a "Use my current location" GPS button (high accuracy, 10-s timeout)
 *  - Shows a Leaflet map with a draggable marker
 *  - Reverse-geocodes every coordinate change
 *  - Calls onChange({ lat, lng, address, pincode }) whenever location updates
 *  - Accepts initialLat / initialLng for edit mode
 *
 * Does NOT show raw lat/lng inputs – those are kept hidden in the parent form.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Search, MapPin, AlertCircle, Loader2, X } from 'lucide-react';
import { reverseGeocode, searchAddress } from '../features/location/geocodeApi';

// ─── Fix Leaflet default marker icon for Vite / webpack ──────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Default center: India
const INDIA_CENTER = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;
const DETAIL_ZOOM = 15;

// ─── Draggable marker sub-component ──────────────────────────────────────────
function DraggableMarker({ position, onDragEnd }) {
  const markerRef = useRef(null);

  const eventHandlers = {
    dragend() {
      const m = markerRef.current;
      if (m) {
        const latlng = m.getLatLng();
        onDragEnd(latlng.lat, latlng.lng);
      }
    },
  };

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    />
  );
}

// ─── Click-to-place on map ────────────────────────────────────────────────────
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ─── Fly-to helper ────────────────────────────────────────────────────────────
function FlyTo({ position }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (position) {
      map.flyTo(position, DETAIL_ZOOM, { animate: true, duration: 1 });
    }
  }, [position, map]);
  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────
/**
 * @param {{
 *   initialLat?: number;
 *   initialLng?: number;
 *   onChange: (loc: { lat: number; lng: number; address: string; pincode: string }) => void;
 * }} props
 */
export default function LocationPicker({ initialLat, initialLng, onChange }) {
  // Current pin position (null = not yet placed)
  const hasInitial = initialLat != null && initialLng != null &&
    !isNaN(Number(initialLat)) && !isNaN(Number(initialLng));

  const [position, setPosition] = useState(
    hasInitial ? [Number(initialLat), Number(initialLng)] : null
  );

  // GPS state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  // Reverse-geocode loading state
  const [geocoding, setGeocoding] = useState(false);

  // Search box state
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // ── If initial coords set, reverse geocode once on mount ─────────────────
  useEffect(() => {
    if (hasInitial) {
      doReverseGeocode(Number(initialLat), Number(initialLng));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reverse geocode helper ────────────────────────────────────────────────
  const doReverseGeocode = useCallback(async (lat, lng) => {
    setGeocoding(true);
    try {
      const result = await reverseGeocode(lat, lng);
      onChange({ lat, lng, address: result.address, pincode: result.pincode });
      if (!result.pincode) {
        // pincode missing — caller will show a message asking user to fill it
      }
    } catch {
      // silently fail – user can still edit address manually
    } finally {
      setGeocoding(false);
    }
  }, [onChange]);

  // ── Place pin helper (called from GPS, map click, marker drag, search pick) ─
  const placePin = useCallback((lat, lng) => {
    setPosition([lat, lng]);
    doReverseGeocode(lat, lng);
  }, [doReverseGeocode]);

  // ── GPS ───────────────────────────────────────────────────────────────────
  const handleGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        placePin(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Location access was denied. Please allow it in your browser settings.');
        } else if (err.code === err.TIMEOUT) {
          setGpsError('Location request timed out. Try again or search manually.');
        } else {
          setGpsError('Could not get your location. Try searching manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
    );
  };

  // ── Address search debounce ───────────────────────────────────────────────
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setActiveIdx(-1);

    clearTimeout(debounceRef.current);
    if (val.trim().length < 3) {
      setSuggestions([]);
      setDropdownOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError('');
      try {
        const results = await searchAddress(val);
        setSuggestions(results);
        setDropdownOpen(results.length > 0);
      } catch {
        setSearchError('Search failed. Please try again.');
      } finally {
        setSearchLoading(false);
      }
    }, 500);
  };

  const handleSuggestionSelect = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const a = item.address ?? {};
    const rawPostcode = a.postcode ?? '';
    const pincode = /^\d{6}$/.test(rawPostcode) ? rawPostcode : '';

    setQuery('');
    setSuggestions([]);
    setDropdownOpen(false);
    setActiveIdx(-1);

    setPosition([lat, lng]);
    onChange({ lat, lng, address: item.display_name.split(',').slice(0, 3).join(', '), pincode });
  };

  const handleSearchKeyDown = (e) => {
    if (!dropdownOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && suggestions[activeIdx]) {
        handleSuggestionSelect(suggestions[activeIdx]);
      }
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const mapCenter = position ?? INDIA_CENTER;
  const mapZoom = position ? DETAIL_ZOOM : DEFAULT_ZOOM;

  return (
    <div className="space-y-3">
      {/* ── Address search box ──────────────────────────────────────── */}
      <div ref={searchRef} className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Search address
        </label>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            id="location-search"
            type="search"
            value={query}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => suggestions.length > 0 && setDropdownOpen(true)}
            placeholder="e.g. Connaught Place, New Delhi"
            autoComplete="off"
            aria-label="Search for an address"
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
            role="combobox"
            aria-autocomplete="list"
            aria-activedescendant={activeIdx >= 0 ? `suggestion-${activeIdx}` : undefined}
            className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 text-sm
              focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent
              placeholder:text-gray-400 shadow-sm"
          />
          {searchLoading && (
            <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 animate-spin" />
          )}
          {!searchLoading && query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setSuggestions([]); setDropdownOpen(false); }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdown suggestions */}
        {dropdownOpen && suggestions.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-[1000] mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden text-sm"
          >
            {suggestions.map((item, idx) => (
              <li
                key={item.id}
                id={`suggestion-${idx}`}
                role="option"
                aria-selected={idx === activeIdx}
                onMouseDown={(e) => { e.preventDefault(); handleSuggestionSelect(item); }}
                onMouseEnter={() => setActiveIdx(idx)}
                className={`flex items-start gap-2 px-4 py-2.5 cursor-pointer transition-colors
                  ${idx === activeIdx ? 'bg-green-50 text-green-800' : 'hover:bg-gray-50 text-gray-700'}`}
              >
                <MapPin size={14} className="flex-shrink-0 mt-0.5 text-green-500" />
                <span className="line-clamp-2">{item.display_name}</span>
              </li>
            ))}
          </ul>
        )}

        {searchError && (
          <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
            <AlertCircle size={12} /> {searchError}
          </p>
        )}
      </div>

      {/* ── GPS button ──────────────────────────────────────────────── */}
      <div className="space-y-1">
        <button
          id="store-use-location-btn"
          type="button"
          onClick={handleGPS}
          disabled={gpsLoading}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-colors
            ${gpsLoading
              ? 'border-gray-200 text-gray-400 cursor-wait'
              : 'border-green-300 text-green-700 hover:bg-green-50'}`}
          aria-busy={gpsLoading}
        >
          {gpsLoading
            ? <Loader2 size={14} className="animate-spin" />
            : <Navigation size={14} />}
          {gpsLoading ? 'Getting location…' : 'Use my current location'}
        </button>

        {gpsError && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle size={12} /> {gpsError}
          </p>
        )}

        <p className="text-xs text-gray-400 leading-relaxed">
          For best accuracy, set your location from your phone while you are at the store.
        </p>
      </div>

      {/* ── Map ─────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-500">
          {position
            ? 'Drag the pin or click the map to refine'
            : 'No location set yet — search above, use GPS, or click the map'}
        </p>

        <div
          className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm"
          style={{ height: 280 }}
        >
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            <MapClickHandler onMapClick={placePin} />

            {position && (
              <>
                <FlyTo position={position} />
                <DraggableMarker position={position} onDragEnd={placePin} />
              </>
            )}
          </MapContainer>
        </div>

        {geocoding && (
          <p className="text-xs text-green-600 flex items-center gap-1 animate-pulse">
            <Loader2 size={12} className="animate-spin" /> Filling address…
          </p>
        )}
      </div>
    </div>
  );
}
