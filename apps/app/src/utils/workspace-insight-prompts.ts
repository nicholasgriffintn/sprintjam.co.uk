import type { TeamInsights, WorkspaceInsights } from "@sprintjam/types";

type InsightSource = Pick<
  TeamInsights | WorkspaceInsights,
  | "participationRate"
  | "firstRoundConsensusRate"
  | "discussionRate"
  | "questionMarkRate"
  | "sessionsAnalyzed"
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

  if (insights.participationRate < 75) {
    prompts.push({
      title: "Increase participation",
      detail: "Invite missing voters before reveal so estimates reflect the full team.",
      tone: "warning",
    });
  }

  if (insights.discussionRate > 35) {
    prompts.push({
      title: "Pre-split unclear work",
      detail: "High re-vote rate usually means stories need sharper scope before sizing.",
      tone: "warning",
    });
  }

  if (insights.questionMarkRate > 10) {
    prompts.push({
      title: "Resolve unknowns before sizing",
      detail: 'Frequent "?" votes suggest missing context, dependencies, or acceptance criteria.',
      tone: "warning",
    });
  }

  if (
    prompts.length === 0 &&
    insights.firstRoundConsensusRate >= 60 &&
    insights.participationRate >= 75
  ) {
    prompts.push({
      title: "Planning flow looks steady",
      detail: "Consensus and participation are healthy. Keep the current facilitation pattern.",
      tone: "good",
    });
  }

  return prompts.slice(0, 3);
}
