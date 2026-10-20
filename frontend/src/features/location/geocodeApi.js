
const NOMINATIM = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'LocalKart/1.0';

// ─── 1-req/s throttle ──────────────────────────────────────
let _lastRequest = 0;
async function waitForSlot() {
  const now = Date.now();
  const wait = 1050 - (now - _lastRequest); // 1.05 s headroom
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  _lastRequest = Date.now();
}

// ─── Reverse-geocode cache ────────────────────────────────────────
const _reverseCache = new Map(); // key → { address: string, pincode: string }

/** Truncate a Nominatim display_name to the first 3 comma-segments. */
function shortenDisplayName(displayName) {
  if (!displayName) return '';
  const parts = displayName.split(',').map((p) => p.trim());
  return parts.slice(0, 3).join(', ');
}

/**
 * Reverse-geocode (lat, lon) → { address, pincode }.
 * address is a shortened display_name; pincode is '' when unavailable.
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{ address: string; pincode: string }>}
 */
export async function reverseGeocode(lat, lon) {
  const key = `${lat.toFixed(6)},${lon.toFixed(6)}`;
  if (_reverseCache.has(key)) return _reverseCache.get(key);

  await waitForSlot();

  const url =
    `${NOMINATIM}/reverse?format=jsonv2&addressdetails=1` +
    `&lat=${lat}&lon=${lon}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
  });
  if (!res.ok) throw new Error(`Nominatim error ${res.status}`);

  const data = await res.json();
  const a = data.address ?? {};
  const rawPostcode = a.postcode ?? '';
  const pincode = /^\d{6}$/.test(rawPostcode) ? rawPostcode : '';

  const result = {
    address: shortenDisplayName(data.display_name),
    pincode,
  };

  _reverseCache.set(key, result);
  return result;
}

/**
 * Forward geocode – address search suggestions.
 * Returns up to 5 results for India.
 *
 * @param {string} query
 * @returns {Promise<Array<{ id: string; display_name: string; lat: string; lon: string; address: object }>>}
 */
export async function searchAddress(query) {
  if (!query || query.trim().length < 3) return [];

  await waitForSlot();

  const url =
    `${NOMINATIM}/search?format=jsonv2&addressdetails=1` +
    `&countrycodes=in&limit=5&q=${encodeURIComponent(query.trim())}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
  });
  if (!res.ok) throw new Error(`Nominatim error ${res.status}`);

  const data = await res.json();
  return data.map((item) => ({
    id: String(item.place_id),
    display_name: item.display_name,
    lat: item.lat,
    lon: item.lon,
    address: item.address ?? {},
  }));
}
