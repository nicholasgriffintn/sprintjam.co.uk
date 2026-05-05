import { describe, expect, it } from "vitest";
import type { WorkspaceInsights } from "@sprintjam/types";

import { buildInsightPrompts } from "./workspace-insight-prompts";

const baseInsights: WorkspaceInsights = {
  totalVotes: 20,
  totalRounds: 10,
  totalTickets: 8,
  participationRate: 90,
  firstRoundConsensusRate: 70,
  discussionRate: 20,
  estimationVelocity: 4,
  questionMarkRate: 4,
  teamCount: 2,
  sessionsAnalyzed: 5,
  topContributors: [],
};

describe("buildInsightPrompts", () => {
  it("returns risk prompts for weak planning signals", () => {
    const prompts = buildInsightPrompts({
      ...baseInsights,
      participationRate: 62,
      discussionRate: 48,
      questionMarkRate: 16,
    });

    expect(prompts.map((prompt) => prompt.title)).toEqual([
      "Increase participation",
      "Pre-split unclear work",
      "Resolve unknowns before sizing",
    ]);
  });

  it("returns a steady prompt when metrics are healthy", () => {
    const prompts = buildInsightPrompts(baseInsights);

    expect(prompts).toEqual([
      expect.objectContaining({ title: "Planning flow looks steady" }),
    ]);
  });
});
