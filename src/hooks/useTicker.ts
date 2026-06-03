import { useEffect, useState } from 'react';

/**
 * Re-renders every `intervalMs` and returns the current epoch ms. Used to drive
 * live countdown timers (1s tick). The timer value itself is derived from the
 * persisted `startedAt`, so it stays correct across reloads and devices.
 */
export function useTicker(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
