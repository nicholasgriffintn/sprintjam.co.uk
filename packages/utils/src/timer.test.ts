import { describe, expect, it } from "vitest";

import { calculateTimerSeconds } from "./timer";

describe("timer utilities", () => {
  it("returns zero when no timer exists", () => {
    expect(calculateTimerSeconds(undefined, 1000)).toBe(0);
  });

  it("returns stored seconds for paused timers", () => {
    expect(
      calculateTimerSeconds(
        {
          running: false,
          seconds: 45,
          lastUpdateTime: 1000,
        },
        5000,
      ),
    ).toBe(45);
  });

  it("adds elapsed whole seconds for running timers", () => {
    expect(
      calculateTimerSeconds(
        {
          running: true,
          seconds: 45,
          lastUpdateTime: 1000,
        },
        5500,
      ),
    ).toBe(49);
  });
});
