/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { TeamInsights } from "@sprintjam/types";

import { TeamInsightsPanel } from "@/components/workspace/TeamInsightsPanel";

const insights: TeamInsights = {
  sessionsAnalyzed: 4,
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
    render(<TeamInsightsPanel teamName="Platform" insights={insights} />);

    expect(screen.getByText("Team insights")).toBeTruthy();
    expect(screen.getByText("61%")).toBeTruthy();
    expect(screen.getByText("Pre-split unclear work")).toBeTruthy();
  });
});
