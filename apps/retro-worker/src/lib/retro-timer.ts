import type { RetroStateData, TimerState } from "@sprintjam/types";
import { calculateTimerSeconds } from "@sprintjam/utils";
import {
  MAX_TIMER_DURATION_SECONDS,
  MIN_TIMER_DURATION_SECONDS,
} from "@sprintjam/utils/constants";

export const RETRO_TIMER_EXTENSION_SECONDS = 5 * 60;

export function getRetroTimerDurationSeconds(retro: RetroStateData): number {
  return Math.max(
    MIN_TIMER_DURATION_SECONDS,
    Math.min(retro.settings.timerMinutes * 60, MAX_TIMER_DURATION_SECONDS),
  );
}

export function createRetroTimerState({
  now,
  running,
  targetDurationSeconds,
}: {
  now: number;
  running: boolean;
  targetDurationSeconds: number;
}): TimerState {
  return {
    running,
    seconds: 0,
    lastUpdateTime: running ? now : 0,
    targetDurationSeconds,
    roundAnchorSeconds: 0,
    autoResetOnVotesReset: false,
  };
}

export function ensureRetroTimerState(
  retro: RetroStateData,
  now: number = Date.now(),
): TimerState {
  const targetDurationSeconds = getRetroTimerDurationSeconds(retro);

  if (!retro.timerState) {
    retro.timerState = createRetroTimerState({
      now,
      running: retro.status !== "completed",
      targetDurationSeconds,
    });
    return retro.timerState;
  }

  if (
    retro.timerState.targetDurationSeconds === undefined ||
    retro.timerState.targetDurationSeconds === null
  ) {
    retro.timerState.targetDurationSeconds = targetDurationSeconds;
  }

  if (retro.timerState.roundAnchorSeconds === undefined) {
    retro.timerState.roundAnchorSeconds = 0;
  }

  if (retro.timerState.autoResetOnVotesReset === undefined) {
    retro.timerState.autoResetOnVotesReset = false;
  }

  return retro.timerState;
}

export function resetRetroTimer(
  retro: RetroStateData,
  now: number,
  running: boolean,
): TimerState {
  const timerState = createRetroTimerState({
    now,
    running,
    targetDurationSeconds: getRetroTimerDurationSeconds(retro),
  });
  retro.timerState = timerState;
  return timerState;
}

export function pauseRetroTimer(
  retro: RetroStateData,
  now: number,
): TimerState {
  const timerState = ensureRetroTimerState(retro, now);
  timerState.seconds = calculateTimerSeconds(timerState, now);
  timerState.running = false;
  timerState.lastUpdateTime = now;
  return timerState;
}

export function startRetroTimer(
  retro: RetroStateData,
  now: number,
): TimerState {
  const timerState = ensureRetroTimerState(retro, now);
  if (!timerState.running) {
    timerState.running = true;
    timerState.lastUpdateTime = now;
  }
  return timerState;
}

export function configureRetroTimer(
  retro: RetroStateData,
  config: {
    targetDurationSeconds?: number;
    resetCountdown?: boolean;
  },
  now: number,
): TimerState {
  const timerState = ensureRetroTimerState(retro, now);

  if (
    typeof config.targetDurationSeconds === "number" &&
    !Number.isNaN(config.targetDurationSeconds)
  ) {
    timerState.targetDurationSeconds = clampTimerSeconds(
      config.targetDurationSeconds,
    );
  }

  if (config.resetCountdown) {
    timerState.roundAnchorSeconds = calculateTimerSeconds(timerState, now);
  }

  return timerState;
}

export function extendRetroTimer(
  retro: RetroStateData,
  seconds: number,
  now: number,
): TimerState {
  const timerState = ensureRetroTimerState(retro, now);
  const currentSeconds = calculateTimerSeconds(timerState, now);
  const anchorSeconds = timerState.roundAnchorSeconds ?? 0;
  const elapsedSinceAnchor = Math.max(0, currentSeconds - anchorSeconds);
  const currentTarget =
    timerState.targetDurationSeconds ?? getRetroTimerDurationSeconds(retro);
  timerState.targetDurationSeconds = clampTimerSeconds(
    Math.max(currentTarget, elapsedSinceAnchor) + seconds,
  );
  timerState.running = true;
  timerState.seconds = currentSeconds;
  timerState.lastUpdateTime = now;
  return timerState;
}

function clampTimerSeconds(seconds: number): number {
  return Math.max(
    MIN_TIMER_DURATION_SECONDS,
    Math.min(seconds, MAX_TIMER_DURATION_SECONDS),
  );
}
