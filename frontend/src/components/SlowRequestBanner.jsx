import { useEffect, useState } from 'react';

/**
 * Non-blocking top banner that appears when any request takes longer than
 * DELAY_MS. It listens to two window CustomEvents:
 *   - "lk:slow-request"  → show the banner
 *   - "lk:request-done"  → hide the banner
 *
 * Accessible: role="status" + aria-live="polite" so screen-readers announce it
 * without interrupting current content.
 */
const DELAY_MS = 4000;

export default function SlowRequestBanner() {
  const [visible, setVisible] = useState(false);
  const [timer, setTimer] = useState(null);

  // Show the banner after DELAY_MS of continuous "pending" state
  useEffect(() => {
    const onSlow = () => setVisible(true);
    const onDone = () => {
      setVisible(false);
      if (timer) {
        clearTimeout(timer);
        setTimer(null);
      }
    };

    window.addEventListener('lk:slow-request', onSlow);
    window.addEventListener('lk:request-done', onDone);
    return () => {
      window.removeEventListener('lk:slow-request', onSlow);
      window.removeEventListener('lk:request-done', onDone);
    };
  }, [timer]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-0 inset-x-0 z-[9999] flex items-center justify-center px-4 py-2.5
                 bg-amber-50 border-b border-amber-200 shadow-sm
                 animate-[slideDown_0.3s_ease-out]"
    >
      <span className="flex items-center gap-2 text-sm text-amber-800 font-medium">
        {/* Inline spinner */}
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 rounded-full border-2 border-amber-300 border-t-amber-600 animate-spin shrink-0"
        />
        Waking up the server, this can take up to a minute on the first visit.
        Thanks for waiting.
      </span>
    </div>
  );
}

/** Call this to start the 4-second countdown before the banner shows. */
export function startSlowTimer() {
  let id = null;

  const fire = () => window.dispatchEvent(new CustomEvent('lk:slow-request'));
  const cancel = () => {
    if (id !== null) clearTimeout(id);
    window.dispatchEvent(new CustomEvent('lk:request-done'));
  };

  id = setTimeout(fire, DELAY_MS);
  return cancel;
}
