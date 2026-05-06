/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WorkspaceInsights } from "@sprintjam/types";

import { WorkspaceInsightWidgets } from "@/components/workspace/WorkspaceInsightWidgets";

const insights: WorkspaceInsights = {
  totalVotes: 24,
  totalRounds: 8,
  totalTickets: 6,
  sessionTypeCounts: { all: 4, planning: 2, standup: 1, wheel: 1 },
  standup: {
    sessionsAnalyzed: 1,
    totalParticipants: 6,
    responsesSubmitted: 3,
    responseRate: 50,
    healthScoreTotal: 8,
    healthResponseCount: 3,
    averageHealth: 2.7,
    blockerCount: 1,
    blockerRate: 33,
    unresolvedBlockerCount: 1,
    unresolvedBlockerRate: 100,
    linkedTicketCount: 2,
    kudosCount: 0,
  },
  wheel: {
    sessionsAnalyzed: 1,
    totalParticipants: 5,
    entryCount: 5,
    enabledEntryCount: 5,
    spinCount: 4,
    uniqueWinnerCount: 3,
    removedAfterCount: 1,
    repeatWinnerCount: 1,
    averageSpinsPerSession: 4,
    uniqueWinnerRate: 75,
    repeatWinnerRate: 25,
    removalRate: 25,
    modeSessionCounts: { decision: 1, reviewer: 0, facilitator: 0 },
    modeSpinCounts: { decision: 4, reviewer: 0, facilitator: 0 },
  },
  participationRate: 60,
  firstRoundConsensusRate: 50,
  discussionRate: 45,
  estimationVelocity: 3,
  questionMarkRate: 12,
  teamCount: 2,
  sessionsAnalyzed: 4,
  topContributors: [
    {
      userName: "Asha Patel",
      totalVotes: 14,
      participationRate: 88,
      consensusAlignment: 82,
    },
    {
      userName: "Ben Carter",
      totalVotes: 10,
      participationRate: 63,
      consensusAlignment: 57,
    },
  ],
};

describe("WorkspaceInsightWidgets", () => {
  it("renders suggested focus and top contributors as separate widgets", () => {
    render(<WorkspaceInsightWidgets insights={insights} />);

    expect(screen.getByText("Suggested focus")).toBeTruthy();
    expect(screen.getByText("Top contributors")).toBeTruthy();
    expect(screen.getByText("Improve standup coverage")).toBeTruthy();
    expect(screen.getByText("Asha Patel")).toBeTruthy();
    expect(screen.getByText("14 votes")).toBeTruthy();
  });

  it("renders nothing without insight widget content", () => {
    const { container } = render(
      <WorkspaceInsightWidgets
        insights={{ ...insights, sessionsAnalyzed: 0, topContributors: [] }}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
