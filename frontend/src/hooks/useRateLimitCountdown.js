import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Parse the number of seconds to wait from a 429 response.
 *
 * Priority:
 *  1. Retry-After header (integer seconds)
 *  2. "X min Y sec" pattern in the message body
 *  3. "X min" pattern
 *  4. "X seconds" / "X sec" pattern
 *
 * Returns 0 if nothing can be parsed.
 */
export function parseRetrySeconds(message = '', retryAfterHeader = '') {
  if (retryAfterHeader) {
    const n = parseInt(retryAfterHeader, 10);
    if (!isNaN(n) && n > 0) return n;
  }

  // "2 min 14 sec"
  const minSec = message.match(/(\d+)\s*min\s+(\d+)\s*sec/i);
  if (minSec) return parseInt(minSec[1], 10) * 60 + parseInt(minSec[2], 10);

  // "2 min" (no sec part)
  const minOnly = message.match(/(\d+)\s*min/i);
  if (minOnly) return parseInt(minOnly[1], 10) * 60;

  // "40 seconds" or "40 sec"
  const secOnly = message.match(/(\d+)\s*sec/i);
  if (secOnly) return parseInt(secOnly[1], 10);

  return 0;
}

/** Format seconds as m:ss (e.g. 105 → "1:45"). */
export function fmtCountdown(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * useRateLimitCountdown
 *
 * @param {string} storageKey - unique sessionStorage key per form (e.g. "rl_login")
 * @returns {{
 *   rateLimitMsg: string,
 *   countdown: number,
 *   countdownLabel: string,
 *   startRateLimit: (msg: string, retryAfterHeader?: string) => void,
 *   clearRateLimit: () => void,
 * }}
 */
export default function useRateLimitCountdown(storageKey) {
  const [rateLimitMsg, setRateLimitMsg] = useState('');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearRateLimit = useCallback(() => {
    stopTimer();
    setRateLimitMsg('');
    setCountdown(0);
    try { sessionStorage.removeItem(storageKey); } catch {}
  }, [storageKey, stopTimer]);

  const beginCountdown = useCallback((seconds, msg) => {
    stopTimer();
    setRateLimitMsg(msg);
    setCountdown(seconds);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Will call clearRateLimit on next tick via the effect below
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopTimer]);

  // When countdown hits 0 via the interval, clean up
  useEffect(() => {
    if (countdown === 0 && timerRef.current) {
      stopTimer();
      setRateLimitMsg('');
      try { sessionStorage.removeItem(storageKey); } catch {}
    }
  }, [countdown, storageKey, stopTimer]);

  const startRateLimit = useCallback((msg, retryAfterHeader = '') => {
    const seconds = parseRetrySeconds(msg, retryAfterHeader);
    if (seconds > 0) {
      const unlockAt = Date.now() + seconds * 1000;
      try {
        sessionStorage.setItem(storageKey, JSON.stringify({ unlockAt, msg }));
      } catch {}
      beginCountdown(seconds, msg);
    } else {
      // No parseable timer — show the message without a countdown
      setRateLimitMsg(msg);
    }
  }, [storageKey, beginCountdown]);

  // Restore from sessionStorage on mount (survives page refresh)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        let unlockAt = 0;
        let savedMsg = '';
        if (raw.startsWith('{')) {
          const parsed = JSON.parse(raw);
          unlockAt = Number(parsed.unlockAt) || 0;
          savedMsg = parsed.msg || '';
        } else {
          unlockAt = parseInt(raw, 10);
        }
        const remaining = Math.ceil((unlockAt - Date.now()) / 1000);
        if (remaining > 0) {
          beginCountdown(
            remaining,
            savedMsg || 'Too many attempts. Please wait before trying again.'
          );
        } else {
          sessionStorage.removeItem(storageKey);
        }
      }
    } catch {}

    return stopTimer;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    rateLimitMsg,
    countdown,
    countdownLabel: countdown > 0 ? fmtCountdown(countdown) : '',
    startRateLimit,
    clearRateLimit,
  };
}
