import type { TimerState } from '../types';

export function calculateTimerSeconds(
  timerState: TimerState | undefined,
  now: number = Date.now()
): number {
  if (!timerState) {
    return 0;
  }

  if (!timerState.running) {
    return timerState.seconds ?? 0;
  }

  const elapsedMs = now - timerState.lastUpdateTime;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  return (timerState.seconds ?? 0) + elapsedSeconds;
}
