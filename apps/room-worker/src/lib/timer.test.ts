import { describe, expect, it } from 'vitest';
import { type RoomData, JudgeAlgorithm } from '@sprintjam/types';
import { DEFAULT_TIMER_DURATION_SECONDS } from '@sprintjam/utils/constants';

import { ensureTimerState } from './timer';

import { calculateTimerSeconds } from './timer';

describe('timer utils', () => {
  it('returns zero when no timer state exists', () => {
    expect(calculateTimerSeconds(undefined, 1_000)).toBe(0);
  });

  it('returns stored seconds when the timer is paused', () => {
    expect(
      calculateTimerSeconds(
        { running: false, seconds: 42, lastUpdateTime: 0 },
        5_000,
      ),
    ).toBe(42);
  });

  it('adds elapsed seconds when the timer is running', () => {
    const result = calculateTimerSeconds(
      { running: true, seconds: 10, lastUpdateTime: 2_000 },
      5_400,
    );
    expect(result).toBe(13); // 3.4s elapsed, floored to 3
  });

  it('handles missing seconds in a running state', () => {
    const result = calculateTimerSeconds(
      { running: true, seconds: undefined as any, lastUpdateTime: 1_000 },
      2_500,
    );
    expect(result).toBe(1);
  });
});

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
      DEFAULT_TIMER_DURATION_SECONDS,
    );
    expect(timerState.roundAnchorSeconds).toBe(0);
    expect(timerState.autoResetOnVotesReset).toBe(true);
  });
});
