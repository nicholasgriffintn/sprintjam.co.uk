import {
  MAX_TIMER_DURATION_SECONDS,
  MIN_TIMER_DURATION_SECONDS,
} from '../../constants';
import { calculateTimerSeconds } from '../../utils/timer';
import { ensureTimerState } from '../../utils/timer-state';
import type { PlanningRoom } from '.';

export async function handleStartTimer(room: PlanningRoom, userName: string) {
  await room.state.blockConcurrencyWhile(async () => {
    const roomData = await room.getRoomData({ skipConcurrencyBlock: true });
    if (!roomData) {
      return;
    }

    if (roomData.moderator !== userName) {
      return;
    }

    const timerState = ensureTimerState(roomData);
    if (timerState.running) {
      return;
    }

    const currentTime = Date.now();
    room.repository.startTimer(currentTime);

    timerState.running = true;
    timerState.lastUpdateTime = currentTime;

    room.broadcast({
      type: 'timerStarted',
      timerState,
    });
  });
}

export async function handlePauseTimer(room: PlanningRoom, userName: string) {
  await room.state.blockConcurrencyWhile(async () => {
    const roomData = await room.getRoomData({ skipConcurrencyBlock: true });
    if (!roomData) {
      return;
    }

    if (roomData.moderator !== userName) {
      return;
    }

    const currentTime = Date.now();
    room.repository.pauseTimer(currentTime);

    const updatedRoomData = await room.getRoomData({
      skipConcurrencyBlock: true,
    });
    if (updatedRoomData?.timerState) {
      room.broadcast({
        type: 'timerPaused',
        timerState: updatedRoomData.timerState,
      });
    }
  });
}

export async function handleResetTimer(room: PlanningRoom, userName: string) {
  await room.state.blockConcurrencyWhile(async () => {
    const roomData = await room.getRoomData({ skipConcurrencyBlock: true });
    if (!roomData) {
      return;
    }

    if (roomData.moderator !== userName) {
      return;
    }

    room.repository.resetTimer();

    const timerState = ensureTimerState(roomData);
    timerState.running = false;
    timerState.seconds = 0;
    timerState.lastUpdateTime = 0;
    timerState.roundAnchorSeconds = 0;

    room.broadcast({
      type: 'timerReset',
      timerState,
    });
  });
}

export async function handleConfigureTimer(
  room: PlanningRoom,
  userName: string,
  config: {
    targetDurationSeconds?: number;
    autoResetOnVotesReset?: boolean;
    resetCountdown?: boolean;
  }
) {
  await room.state.blockConcurrencyWhile(async () => {
    const roomData = await room.getRoomData({ skipConcurrencyBlock: true });
    if (!roomData) {
      return;
    }

    if (roomData.moderator !== userName) {
      return;
    }

    const timerState = ensureTimerState(roomData);
    const updates: {
      targetDurationSeconds?: number;
      autoResetOnVotesReset?: boolean;
      roundAnchorSeconds?: number;
    } = {};

    if (
      typeof config.targetDurationSeconds === 'number' &&
      !Number.isNaN(config.targetDurationSeconds)
    ) {
      const clamped = Math.max(
        MIN_TIMER_DURATION_SECONDS,
        Math.min(config.targetDurationSeconds, MAX_TIMER_DURATION_SECONDS)
      );
      timerState.targetDurationSeconds = clamped;
      updates.targetDurationSeconds = clamped;
    }

    if (typeof config.autoResetOnVotesReset === 'boolean') {
      timerState.autoResetOnVotesReset = config.autoResetOnVotesReset;
      updates.autoResetOnVotesReset = config.autoResetOnVotesReset;
    }

    if (config.resetCountdown) {
      const now = Date.now();
      const currentSeconds = calculateTimerSeconds(timerState, now);
      timerState.roundAnchorSeconds = currentSeconds;
      updates.roundAnchorSeconds = currentSeconds;
    } else if (timerState.roundAnchorSeconds === undefined) {
      timerState.roundAnchorSeconds = 0;
      updates.roundAnchorSeconds = 0;
    }

    if (Object.keys(updates).length === 0) {
      return;
    }

    room.repository.updateTimerConfig(updates);

    room.broadcast({
      type: 'timerUpdated',
      timerState,
    });
  });
}
