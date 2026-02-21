import type { TimerState } from "@sprintjam/types";

import { DEFAULT_TIMER_DURATION_SECONDS } from "@/constants";

export function calculateCurrentSeconds(
  timerState: TimerState | undefined,
): number {
  if (!timerState) return 0;

  if (!timerState.running) {
    return timerState.seconds;
  }

  const now = Date.now();
  const elapsedMs = now - timerState.lastUpdateTime;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  return timerState.seconds + elapsedSeconds;
}

export function getTargetDurationSeconds(
  timerState: TimerState | undefined,
): number {
  return timerState?.targetDurationSeconds ?? DEFAULT_TIMER_DURATION_SECONDS;
}

export function calculateElapsedSinceAnchor(
  timerState: TimerState | undefined,
  currentSeconds: number,
): number {
  const anchor = timerState?.roundAnchorSeconds ?? 0;
  return Math.max(0, currentSeconds - anchor);
}

export function calculateRemainingSeconds(
  timerState: TimerState | undefined,
  currentSeconds: number,
): number {
  const targetDuration = getTargetDurationSeconds(timerState);
  const elapsedSinceAnchor = calculateElapsedSinceAnchor(
    timerState,
    currentSeconds,
  );
  return Math.max(0, targetDuration - elapsedSinceAnchor);
}
