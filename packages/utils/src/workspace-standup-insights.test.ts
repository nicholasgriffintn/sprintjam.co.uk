import { describe, expect, it } from "vitest";
import type { StandupData } from "@sprintjam/types";

import {
  aggregateWorkspaceStandupInsights,
  buildWorkspaceStandupSessionInsights,
} from "./workspace-standup-insights";

const standupData: StandupData = {
  key: "STAND1",
  users: ["Ava", "Ben", "Cara"],
  moderator: "Ava",
  connectedUsers: { Ava: true, Ben: true, Cara: false },
  status: "completed",
  respondedUsers: ["Ava", "Ben"],
  responses: [
    {
      userName: "Ava",
      hasBlocker: true,
      blockerResolved: false,
      blockerDescription: "Waiting on review",
      healthCheck: 2,
      linkedTickets: [
        {
          id: "issue-1",
          key: "SJ-1",
          title: "Review launch",
          provider: "github",
        },
      ],
      kudos: "Ben paired on deploys",
      submittedAt: 1,
      updatedAt: 1,
    },
    {
      userName: "Ben",
      hasBlocker: false,
      healthCheck: 4,
      submittedAt: 2,
      updatedAt: 2,
    },
  ],
};

describe("workspace standup insights", () => {
  it("builds session-level metrics from standup responses", () => {
    expect(buildWorkspaceStandupSessionInsights(standupData)).toEqual({
      totalParticipants: 3,
      responsesSubmitted: 2,
      healthScoreTotal: 6,
      healthResponseCount: 2,
      blockerCount: 1,
      unresolvedBlockerCount: 1,
      linkedTicketCount: 1,
      kudosCount: 1,
    });
  });

  it("aggregates standup session metrics into rates", () => {
    const aggregate = aggregateWorkspaceStandupInsights([
      buildWorkspaceStandupSessionInsights(standupData),
    ]);

    expect(aggregate.sessionsAnalyzed).toBe(1);
    expect(aggregate.responseRate).toBeCloseTo(66.7, 1);
    expect(aggregate.averageHealth).toBe(3);
    expect(aggregate.blockerRate).toBe(50);
    expect(aggregate.unresolvedBlockerRate).toBe(100);
  });
});
