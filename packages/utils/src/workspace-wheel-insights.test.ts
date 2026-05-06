import { describe, expect, it } from "vitest";

import {
  aggregateWorkspaceWheelInsights,
  buildWorkspaceWheelSessionInsights,
} from "./workspace-wheel-insights";

describe("workspace wheel insights", () => {
  it("builds session-level metrics from wheel results", () => {
    expect(
      buildWorkspaceWheelSessionInsights({
        mode: "reviewer",
        totalParticipants: 4,
        entryCount: 3,
        enabledEntryCount: 2,
        results: [
          { winner: "Ava", removedAfter: false },
          { winner: "Ben", removedAfter: true },
          { winner: "Ava", removedAfter: false },
        ],
      }),
    ).toEqual({
      mode: "reviewer",
      totalParticipants: 4,
      entryCount: 3,
      enabledEntryCount: 2,
      spinCount: 3,
      uniqueWinnerCount: 2,
      removedAfterCount: 1,
      repeatWinnerCount: 1,
    });
  });

  it("aggregates wheel metrics into rates and mode counts", () => {
    const aggregate = aggregateWorkspaceWheelInsights([
      buildWorkspaceWheelSessionInsights({
        mode: "reviewer",
        totalParticipants: 4,
        entryCount: 3,
        enabledEntryCount: 2,
        results: [
          { winner: "Ava", removedAfter: false },
          { winner: "Ben", removedAfter: true },
          { winner: "Ava", removedAfter: false },
        ],
      }),
      buildWorkspaceWheelSessionInsights({
        mode: "decision",
        totalParticipants: 2,
        entryCount: 2,
        enabledEntryCount: 2,
        results: [{ winner: "Ship it", removedAfter: false }],
      }),
    ]);

    expect(aggregate.sessionsAnalyzed).toBe(2);
    expect(aggregate.spinCount).toBe(4);
    expect(aggregate.averageSpinsPerSession).toBe(2);
    expect(aggregate.uniqueWinnerRate).toBe(75);
    expect(aggregate.repeatWinnerRate).toBe(25);
    expect(aggregate.removalRate).toBe(25);
    expect(aggregate.modeSessionCounts).toEqual({
      decision: 1,
      reviewer: 1,
      facilitator: 0,
    });
    expect(aggregate.modeSpinCounts.reviewer).toBe(3);
  });
});
