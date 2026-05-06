/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { WorkspaceInsights } from "@sprintjam/types";

import { InsightsGrid } from "./InsightsGrid";

const insights: WorkspaceInsights = {
  totalVotes: 12,
  totalRounds: 4,
  totalTickets: 3,
  sessionTypeCounts: { all: 5, planning: 2, standup: 2, wheel: 1 },
  standup: {
    sessionsAnalyzed: 2,
    totalParticipants: 10,
    responsesSubmitted: 8,
    responseRate: 80,
    healthScoreTotal: 28,
    healthResponseCount: 8,
    averageHealth: 3.5,
    blockerCount: 2,
    blockerRate: 25,
    unresolvedBlockerCount: 1,
    unresolvedBlockerRate: 50,
    linkedTicketCount: 4,
    kudosCount: 2,
  },
  wheel: {
    sessionsAnalyzed: 1,
    totalParticipants: 4,
    entryCount: 4,
    enabledEntryCount: 3,
    spinCount: 3,
    uniqueWinnerCount: 2,
    removedAfterCount: 1,
    repeatWinnerCount: 1,
    averageSpinsPerSession: 3,
    uniqueWinnerRate: 67,
    repeatWinnerRate: 33,
    removalRate: 33,
    modeSessionCounts: { decision: 0, reviewer: 1, facilitator: 0 },
    modeSpinCounts: { decision: 0, reviewer: 3, facilitator: 0 },
  },
  participationRate: 88,
  firstRoundConsensusRate: 67,
  discussionRate: 33,
  estimationVelocity: 3,
  questionMarkRate: 8,
  teamCount: 2,
  sessionsAnalyzed: 5,
  topContributors: [
    {
      userName: "Asha Patel",
      totalVotes: 8,
      participationRate: 90,
      consensusAlignment: 75,
    },
  ],
};

describe("InsightsGrid", () => {
  it("renders cross-feature collaboration summaries", () => {
    render(<InsightsGrid insights={insights} />);

    expect(screen.getByText("Collaboration Insights")).toBeTruthy();
    expect(screen.getByText("Standups")).toBeTruthy();
    expect(screen.getByText("Wheels")).toBeTruthy();
    expect(screen.getByText("Standup response")).toBeTruthy();
    expect(screen.getByText("Average health")).toBeTruthy();
    expect(screen.getByText("Wheel spins")).toBeTruthy();
    expect(screen.queryByText("Top contributors")).toBeNull();
    expect(screen.queryByText("Asha Patel")).toBeNull();
  });
});
