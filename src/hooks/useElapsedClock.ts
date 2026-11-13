import { useEffect, useState } from 'react';
import { readElapsed, type TimerState } from '../lib/timer';

export function useElapsedClock(timer: TimerState | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!timer?.running) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer?.running, timer?.runningSince]);

  if (!timer) return 0;
  return readElapsed(timer, now);
}
