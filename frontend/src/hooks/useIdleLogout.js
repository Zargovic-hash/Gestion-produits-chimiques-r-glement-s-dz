import { useEffect, useRef } from 'react';

const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30 minutes, cf. spec §6.1
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

export function useIdleLogout(onIdle) {
  const timerRef = useRef(null);

  useEffect(() => {
    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(onIdle, IDLE_LIMIT_MS);
    };

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer));
    resetTimer();

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onIdle]);
}
