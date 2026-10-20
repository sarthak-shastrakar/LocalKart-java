/**
 * Format a distance value (km, 1 decimal) into a human-readable string.
 *
 * @param {number|null|undefined} distanceKm - Distance in kilometres, or null/undefined
 * @returns {string|null} Formatted string like "400 m away" or "1.2 km away",
 *                        or null when distanceKm is null / undefined.
 */
export function formatDistance(distanceKm) {
  if (distanceKm == null || typeof distanceKm !== 'number') return null;
  if (distanceKm < 1) {
    // Convert to metres, round to nearest 10 m for cleanliness
    const metres = Math.round(distanceKm * 1000 / 10) * 10;
    return `${metres} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}
