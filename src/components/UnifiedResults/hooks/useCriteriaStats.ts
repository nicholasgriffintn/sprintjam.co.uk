import { useMemo } from "react";

import type { CriteriaStats, RoomData, VotingCriterion } from "../../../types";

export function useCriteriaStats(
  roomData: RoomData,
  criteria?: VotingCriterion[],
) {
  return useMemo((): (CriteriaStats & { maxScore: number })[] => {
    if (!criteria || !roomData.structuredVotes) return [];

    const structuredVotes = Object.values(roomData.structuredVotes);
    if (structuredVotes.length === 0) return [];

    return criteria.map((criterion) => {
      const scores = structuredVotes
        .map((vote) => vote.criteriaScores[criterion.id])
        .filter((score) => score !== undefined);

      if (scores.length === 0) {
        return {
          criterionId: criterion.id,
          name: criterion.name,
          average: 0,
          min: 0,
          max: 0,
          variance: 0,
          consensus: "low" as const,
          maxScore: criterion.maxScore,
        };
      }

      const average =
        scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      const variance = max - min;

      let consensus: "high" | "medium" | "low";
      if (criterion.id === "unknowns") {
        consensus = variance === 0 ? "high" : variance === 1 ? "medium" : "low";
      } else {
        const relativeVariance = variance / criterion.maxScore;
        consensus =
          relativeVariance <= 0.25
            ? "high"
            : relativeVariance <= 0.5
              ? "medium"
              : "low";
      }

      return {
        criterionId: criterion.id,
        name: criterion.name,
        average,
        min,
        max,
        variance,
        consensus,
        maxScore: criterion.maxScore,
      };
    });
  }, [roomData.structuredVotes, criteria]);
}
