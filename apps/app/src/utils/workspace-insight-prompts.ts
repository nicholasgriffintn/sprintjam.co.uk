import type { TeamInsights, WorkspaceInsights } from "@sprintjam/types";

type InsightSource = Pick<
  TeamInsights | WorkspaceInsights,
  | "participationRate"
  | "firstRoundConsensusRate"
  | "discussionRate"
  | "questionMarkRate"
  | "sessionsAnalyzed"
  | "totalRounds"
  | "standup"
>;

export interface InsightPrompt {
  title: string;
  detail: string;
  tone: "good" | "warning";
}

export function buildInsightPrompts(insights: InsightSource): InsightPrompt[] {
  if (insights.sessionsAnalyzed === 0) {
    return [];
  }

  const prompts: InsightPrompt[] = [];

  if (
    insights.standup.sessionsAnalyzed > 0 &&
    insights.standup.responseRate < 80
  ) {
    prompts.push({
      title: "Improve standup coverage",
      detail:
        "Low response rate means blockers and next steps may be missing from the team picture.",
      tone: "warning",
    });
  }

  if (
    insights.standup.averageHealth !== null &&
    insights.standup.averageHealth < 3
  ) {
    prompts.push({
      title: "Check team health",
      detail:
        "Standup health is trending low. Use the next sync to surface load or delivery pressure.",
      tone: "warning",
    });
  }

  if (insights.standup.unresolvedBlockerCount > 0) {
    prompts.push({
      title: "Clear standup blockers",
      detail: "Unresolved blockers are still showing up in completed standups.",
      tone: "warning",
    });
  }

  if (insights.totalRounds > 0 && insights.participationRate < 75) {
    prompts.push({
      title: "Increase participation",
      detail:
        "Invite missing voters before reveal so estimates reflect the full team.",
      tone: "warning",
    });
  }

  if (insights.totalRounds > 0 && insights.discussionRate > 35) {
    prompts.push({
      title: "Pre-split unclear work",
      detail:
        "High re-vote rate usually means stories need sharper scope before sizing.",
      tone: "warning",
    });
  }

  if (insights.totalRounds > 0 && insights.questionMarkRate > 10) {
    prompts.push({
      title: "Resolve unknowns before sizing",
      detail:
        'Frequent "?" votes suggest missing context, dependencies, or acceptance criteria.',
      tone: "warning",
    });
  }

  if (
    prompts.length === 0 &&
    insights.totalRounds > 0 &&
    insights.firstRoundConsensusRate >= 60 &&
    insights.participationRate >= 75
  ) {
    prompts.push({
      title: "Planning flow looks steady",
      detail:
        "Consensus and participation are healthy. Keep the current facilitation pattern.",
      tone: "good",
    });
  }

  return prompts.slice(0, 3);
}
