import { useEffect, useRef, useState, useCallback } from 'react';

const IDLE_MS  = 30 * 60 * 1000; // 30 min → forced logout
const WARN_MS  =  2 * 60 * 1000; // warn when 2 min remain

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

/**
 * Tracks user inactivity and returns warning state.
 *
 * @param {Function} onLogout – called when the session expires
 * @returns {{ showWarning: boolean, countdown: number, keepAlive: Function }}
 */
export function useSessionTimeout(onLogout) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown]     = useState(WARN_MS / 1000);

  const warnTimer    = useRef(null);
  const logoutTimer  = useRef(null);
  const countInterval = useRef(null);

  const clearAllTimers = useCallback(() => {
    clearTimeout(warnTimer.current);
    clearTimeout(logoutTimer.current);
    clearInterval(countInterval.current);
  }, []);

  const startTimers = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    setCountdown(WARN_MS / 1000);

    // Show warning when 2 min remain
    warnTimer.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(WARN_MS / 1000);

      // Tick countdown every second
      countInterval.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countInterval.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, IDLE_MS - WARN_MS);

    // Force logout after full idle period
    logoutTimer.current = setTimeout(() => {
      clearAllTimers();
      setShowWarning(false);
      onLogout();
    }, IDLE_MS);
  }, [clearAllTimers, onLogout]);

  // Reset on any user activity
  const handleActivity = useCallback(() => {
    if (showWarning) return; // don't reset while warning is visible
    startTimers();
  }, [showWarning, startTimers]);

  // "Stay logged in" button handler
  const keepAlive = useCallback(() => {
    startTimers();
  }, [startTimers]);

  useEffect(() => {
    startTimers();
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    return () => {
      clearAllTimers();
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, handleActivity));
    };
  }, [startTimers, handleActivity, clearAllTimers]);

  return { showWarning, countdown, keepAlive };
}
