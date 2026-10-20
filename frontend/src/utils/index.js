/** Shared utility helpers */

/** INR currency formatter */
export const inr = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);

/** Format "HH:mm" -> "9:00 AM" */
export const fmtTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m);
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
};

/** Date formatter "19 Oct 2026" (en-IN) */
export const fmtDate = (d) => {
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(d));
  } catch {
    return String(d);
  }
};

/** DateTime formatter "19 Oct 2026, 8:00 AM" (en-IN) */
export const fmtDateTime = (d) => {
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(d));
  } catch {
    return String(d);
  }
};

/** Category display labels and badge colours */
export const CATEGORY_META = {
  GROCERY:     { label: 'Grocery',     color: 'bg-lime-100 text-lime-700' },
  MEDICAL:     { label: 'Medical',     color: 'bg-blue-100 text-blue-700' },
  BAKERY:      { label: 'Bakery',      color: 'bg-amber-100 text-amber-700' },
  ELECTRONICS: { label: 'Electronics', color: 'bg-violet-100 text-violet-700' },
  VEGETABLES:  { label: 'Vegetables',  color: 'bg-green-100 text-green-700' },
  OTHER:       { label: 'Other',       color: 'bg-gray-100 text-gray-600' },
};

export const categoryBadge = (cat) => CATEGORY_META[cat] ?? CATEGORY_META.OTHER;

/** Block reason display labels and badge colours */
export const BLOCK_REASON_META = {
  FRAUD:             { label: 'Fraud',             color: 'bg-red-100 text-red-700 border-red-200' },
  FAKE_STORE:        { label: 'Fake Store',        color: 'bg-orange-100 text-orange-700 border-orange-200' },
  ABUSIVE_BEHAVIOR:  { label: 'Abusive Behavior',  color: 'bg-purple-100 text-purple-700 border-purple-200' },
  POLICY_VIOLATION:  { label: 'Policy Violation',  color: 'bg-amber-100 text-amber-700 border-amber-200' },
  OTHER:             { label: 'Other',             color: 'bg-gray-100 text-gray-700 border-gray-200' },
};

export const blockReasonBadge = (reason) => BLOCK_REASON_META[reason] ?? BLOCK_REASON_META.OTHER;

