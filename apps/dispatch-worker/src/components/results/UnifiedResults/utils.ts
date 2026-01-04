import type {
  RoomData,
  RoomStats,
  JudgeMetadata,
  CriteriaStats,
} from "@/types";

type ExtendedCriteriaStats = CriteriaStats & { maxScore?: number };

export interface ConsensusSummaryResult {
  level: "high" | "medium" | "low" | "none";
  score: number | null;
  summary: string;
  needsDiscussion: boolean;
}

const CONFIDENCE_SCORE_MAP: Record<"high" | "medium" | "low", number> = {
  high: 95,
  medium: 65,
  low: 35,
};

export function getGridCols(visibleStatsCount: number) {
  if (visibleStatsCount === 0) return "";
  if (visibleStatsCount === 1) return "grid-cols-1";
  if (visibleStatsCount === 2) return "grid-cols-2";
  return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
}

export function calculateParticipationRate(
  stats: RoomStats,
  roomData: RoomData,
) {
  const denominator = stats.totalUsers || roomData.users.length;
  if (!denominator) return 0;
  return stats.votedUsers / denominator;
}

export function buildConsensusSummary(
  criteriaStats: ExtendedCriteriaStats[],
  judgeMetadata?: JudgeMetadata,
): ConsensusSummaryResult {
  if (judgeMetadata) {
    return {
      level: judgeMetadata.confidence,
      score: CONFIDENCE_SCORE_MAP[judgeMetadata.confidence],
      summary: judgeMetadata.reasoning,
      needsDiscussion: judgeMetadata.needsDiscussion,
    };
  }

  if (!criteriaStats.length) {
    return {
      level: "none",
      score: null,
      summary: "Collect structured votes to understand alignment.",
      needsDiscussion: false,
    };
  }

  const varianceScore = criteriaStats.reduce((acc, stat) => {
    const max = stat.maxScore || 1;
    return acc + stat.variance / max;
  }, 0);
  const normalizedVariance = varianceScore / criteriaStats.length;
  const score = Math.max(0, Math.round(100 - normalizedVariance * 100));

  const consensusCounts = criteriaStats.reduce(
    (acc, stat) => {
      acc[stat.consensus] += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 },
  );

  const level = (Object.entries(consensusCounts).sort(
    ([, a], [, b]) => b - a,
  )[0]?.[0] || "medium") as "high" | "medium" | "low";

  const summary = (() => {
    if (level === "low") return "Team is split. Plan a facilitation moment.";
    if (level === "medium")
      return "Some disagreement detected. Clarify assumptions.";
    return "High alignment detected across criteria.";
  })();

  return {
    level,
    score,
    summary,
    needsDiscussion: level === "low",
  };
}

export function buildRecommendation(params: {
  participationRate: number;
  consensusLevel: "high" | "medium" | "low" | "none";
  needsDiscussion?: boolean;
}) {
  const { participationRate, consensusLevel, needsDiscussion } = params;

  if (needsDiscussion) {
    return "Judge recommends a discussion before finalizing this estimate.";
  }
  if (participationRate < 0.75) {
    return "Remind remaining voters to participate before finalizing.";
  }
  if (consensusLevel === "low") {
    return "Schedule a follow-up discussion to resolve the split.";
  }
  if (consensusLevel === "medium") {
    return "Have the moderator probe differing opinions.";
  }
  if (consensusLevel === "high") {
    return "Looks good—capture the outcome or push it to Jira.";
  }
  return "Review the results and consider next steps.";
}

export function getTopDistribution(stats: RoomStats, roomData: RoomData) {
  const maxCount = roomData.settings.topVotesCount || 4;
  return Object.entries(stats.distribution)
    .filter(([_, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxCount);
}
