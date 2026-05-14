import { describe, expect, it } from "vitest";
import type { WorkspaceInsights } from "@sprintjam/types";

import { buildInsightPrompts } from "./workspace-insight-prompts";

const baseInsights: WorkspaceInsights = {
  totalVotes: 20,
  totalRounds: 10,
  totalTickets: 8,
  sessionTypeCounts: { all: 5, planning: 3, standup: 1, wheel: 1, retro: 0 },
  standup: {
    sessionsAnalyzed: 1,
    totalParticipants: 5,
    responsesSubmitted: 5,
    responseRate: 100,
    healthScoreTotal: 20,
    healthResponseCount: 5,
    averageHealth: 4,
    blockerCount: 0,
    blockerRate: 0,
    unresolvedBlockerCount: 0,
    unresolvedBlockerRate: 0,
    linkedTicketCount: 0,
    kudosCount: 0,
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
  retro: {
    sessions: 0,
    totalParticipants: 0,
    totalCards: 0,
    totalVotes: 0,
    totalActions: 0,
    completedActions: 0,
    averageCardsPerSession: 0,
    averageVotesPerSession: 0,
  },
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

  it("returns standup prompts from standup metrics", () => {
    const prompts = buildInsightPrompts({
      ...baseInsights,
      standup: {
        ...baseInsights.standup,
        responsesSubmitted: 2,
        responseRate: 40,
        averageHealth: 2.4,
        blockerCount: 2,
        unresolvedBlockerCount: 1,
        unresolvedBlockerRate: 50,
      },
    });

    expect(prompts.map((prompt) => prompt.title)).toEqual([
      "Improve standup coverage",
      "Check team health",
      "Clear standup blockers",
    ]);
  });
});
