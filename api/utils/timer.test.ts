import { describe, expect, it } from 'vitest';
import { calculateTimerSeconds } from './timer';

describe('timer utils', () => {
  it('returns zero when no timer state exists', () => {
    expect(calculateTimerSeconds(undefined, 1_000)).toBe(0);
  });

  it('returns stored seconds when the timer is paused', () => {
    expect(
      calculateTimerSeconds(
        { running: false, seconds: 42, lastUpdateTime: 0 },
        5_000
      )
    ).toBe(42);
  });

  it('adds elapsed seconds when the timer is running', () => {
    const result = calculateTimerSeconds(
      { running: true, seconds: 10, lastUpdateTime: 2_000 },
      5_400
    );
    expect(result).toBe(13); // 3.4s elapsed, floored to 3
  });

  it('handles missing seconds in a running state', () => {
    const result = calculateTimerSeconds(
      { running: true, seconds: undefined as any, lastUpdateTime: 1_000 },
      2_500
    );
    expect(result).toBe(1);
  });
});
