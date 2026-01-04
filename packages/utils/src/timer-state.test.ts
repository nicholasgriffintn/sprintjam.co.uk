import { describe, it, expect } from 'vitest';
import { type RoomData, JudgeAlgorithm } from '@sprintjam/types';

import { ensureTimerState } from './timer-state';
import { DEFAULT_TIMER_DURATION_SECONDS } from './config/constants';

const baseRoom = (): RoomData => ({
  key: 'room',
  users: [],
  votes: {},
  connectedUsers: {},
  showVotes: false,
  moderator: 'mod',
  settings: {
    estimateOptions: [1, 2, 3],
    judgeAlgorithm: JudgeAlgorithm.SMART_CONSENSUS,
    allowOthersToShowEstimates: false,
    allowOthersToDeleteEstimates: false,
    showTimer: true,
    showUserPresence: true,
    showAverage: false,
    showMedian: false,
    showTopVotes: false,
    topVotesCount: 0,
    anonymousVotes: false,
    enableJudge: false,
  },
});

describe('ensureTimerState', () => {
  it('initializes timer state with defaults when missing', () => {
    const room = baseRoom();

    const timerState = ensureTimerState(room);

    expect(timerState).toMatchObject({
      running: false,
      seconds: 0,
      lastUpdateTime: 0,
      targetDurationSeconds: DEFAULT_TIMER_DURATION_SECONDS,
      roundAnchorSeconds: 0,
      autoResetOnVotesReset: true,
    });
    expect(room.timerState).toBe(timerState);
  });

  it('fills in missing timer fields but preserves existing values', () => {
    const room = baseRoom();
    room.timerState = {
      running: true,
      seconds: 12,
      lastUpdateTime: 50,
      roundAnchorSeconds: undefined as unknown as number,
      autoResetOnVotesReset: undefined as unknown as boolean,
    };

    const timerState = ensureTimerState(room);

    expect(timerState.running).toBe(true);
    expect(timerState.seconds).toBe(12);
    expect(timerState.lastUpdateTime).toBe(50);
    expect(timerState.targetDurationSeconds).toBe(
      DEFAULT_TIMER_DURATION_SECONDS
    );
    expect(timerState.roundAnchorSeconds).toBe(0);
    expect(timerState.autoResetOnVotesReset).toBe(true);
  });
});
