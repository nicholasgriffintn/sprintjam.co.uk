import type { RoomData, TimerState } from '@sprintjam/types';

import { DEFAULT_TIMER_DURATION_SECONDS } from './config/constants';

export function ensureTimerState(roomData: RoomData): TimerState {
  if (!roomData.timerState) {
    roomData.timerState = {
      running: false,
      seconds: 0,
      lastUpdateTime: 0,
      targetDurationSeconds: DEFAULT_TIMER_DURATION_SECONDS,
      roundAnchorSeconds: 0,
      autoResetOnVotesReset: true,
    };
    return roomData.timerState;
  }

  if (
    roomData.timerState.targetDurationSeconds === undefined ||
    roomData.timerState.targetDurationSeconds === null
  ) {
    roomData.timerState.targetDurationSeconds = DEFAULT_TIMER_DURATION_SECONDS;
  }
  if (roomData.timerState.roundAnchorSeconds === undefined) {
    roomData.timerState.roundAnchorSeconds = 0;
  }
  if (roomData.timerState.autoResetOnVotesReset === undefined) {
    roomData.timerState.autoResetOnVotesReset = true;
  }

  return roomData.timerState;
}
