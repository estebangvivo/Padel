export interface TimerState {
  accumulatedMs: number;
  running: boolean;
  runningSince: number | null;
}

export function readElapsed(timer: TimerState, now: number): number {
  if (!timer.running || timer.runningSince == null) {
    return Math.max(0, timer.accumulatedMs);
  }
  return Math.max(0, timer.accumulatedMs + (now - timer.runningSince));
}

export function formatClock(ms: number): string {
  const safe = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) return `${hours}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}
