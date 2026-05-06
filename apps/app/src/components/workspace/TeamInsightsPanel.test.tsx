/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { TeamInsights } from "@sprintjam/types";

import { TeamInsightsPanel } from "@/components/workspace/TeamInsightsPanel";

const insights: TeamInsights = {
  sessionsAnalyzed: 4,
  sessionTypeCounts: { all: 4, planning: 2, standup: 1, wheel: 1 },
  standup: {
    sessionsAnalyzed: 1,
    totalParticipants: 5,
    responsesSubmitted: 4,
    responseRate: 80,
    healthScoreTotal: 14,
    healthResponseCount: 4,
    averageHealth: 3.5,
    blockerCount: 1,
    blockerRate: 25,
    unresolvedBlockerCount: 1,
    unresolvedBlockerRate: 100,
    linkedTicketCount: 2,
    kudosCount: 1,
  },
  totalTickets: 18,
  totalRounds: 22,
  participationRate: 96,
  firstRoundConsensusRate: 61,
  discussionRate: 39,
  estimationVelocity: 7.5,
  questionMarkRate: 8,
};

describe("TeamInsightsPanel", () => {
  it("renders loader-provided team insights", () => {
    render(
      <TeamInsightsPanel
        teamName="Platform"
        insights={insights}
        sessionCounts={{ all: 6, planning: 3, standup: 2, wheel: 1 }}
      />,
    );

    expect(screen.getByText("Team insights")).toBeTruthy();
    expect(screen.getByText("61%")).toBeTruthy();
    expect(screen.getByText("Standups")).toBeTruthy();
    expect(screen.getByText("Average health")).toBeTruthy();
    expect(screen.getByText("3.5/5")).toBeTruthy();
    expect(screen.getByText("Pre-split unclear work")).toBeTruthy();
  });
});
