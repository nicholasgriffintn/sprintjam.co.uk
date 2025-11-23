import type { TimerState } from "@/types";

export function calculateCurrentSeconds(timerState: TimerState | undefined): number {
    if (!timerState) return 0;

    if (!timerState.running) {
        return timerState.seconds;
    }

    const now = Date.now();
    const elapsedMs = now - timerState.lastUpdateTime;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);

    return timerState.seconds + elapsedSeconds;
}