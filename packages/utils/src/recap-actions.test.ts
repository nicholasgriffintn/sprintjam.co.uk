import { describe, expect, it } from "vitest";

import {
  buildPlanningFollowUpActionId,
  buildWheelOutcomeActionId,
  isResolvedRecapAction,
  resolveTeamSessionRecapAction,
} from "./recap-actions";

describe("recap action utilities", () => {
  it("builds stable IDs for existing string follow-ups", () => {
    expect(buildPlanningFollowUpActionId(12, "Review API blocker")).toBe(
      "planning-follow-up-12-review-api-blocker",
    );
  });

  it("marks matching planning follow-ups resolved without dropping history", () => {
    const actionId = buildPlanningFollowUpActionId(12, "Review API blocker");
    const result = resolveTeamSessionRecapAction({
      metadata: {
        planningFollowUps: ["Review API blocker", "Estimate API blocker"],
      },
      kind: "planning_follow_up",
      sessionId: 12,
      actionId: actionId ?? "",
      resolvedAt: 1_700_000_000,
      resolvedById: 42,
    });

    expect(result.matched).toBe(true);
    expect(result.metadata.planningFollowUps).toEqual([
      {
        title: "Review API blocker",
        status: "resolved",
        resolvedAt: 1_700_000_000,
        resolvedById: 42,
      },
      "Estimate API blocker",
    ]);
  });

  it("marks matching wheel outcomes resolved", () => {
    const actionId = buildWheelOutcomeActionId(12, "spin-1");
    const result = resolveTeamSessionRecapAction({
      metadata: {
        wheelOutcomes: [
          {
            id: "spin-1",
            winner: "Ship release candidate",
          },
        ],
      },
      kind: "wheel_outcome",
      sessionId: 12,
      actionId: actionId ?? "",
      resolvedAt: 1_700_000_000,
      resolvedById: 42,
    });

    expect(result.matched).toBe(true);
    expect(result.metadata.wheelOutcomes).toEqual([
      {
        id: "spin-1",
        winner: "Ship release candidate",
        status: "resolved",
        resolvedAt: 1_700_000_000,
        resolvedById: 42,
      },
    ]);
  });

  it("recognises resolved recap action objects", () => {
    expect(isResolvedRecapAction({ status: "resolved" })).toBe(true);
    expect(isResolvedRecapAction({ resolvedAt: 1 })).toBe(true);
    expect(isResolvedRecapAction("Review API blocker")).toBe(false);
  });
});
