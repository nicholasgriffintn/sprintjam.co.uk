import type { JudgeAlgorithm, JudgeResult } from "../types";
import { findClosestOption } from "../utils/judge";

export class PlanningPokerJudge {
  calculateJudgeScore(
    numericVotes: number[],
    algorithm: JudgeAlgorithm,
    validOptions: number[],
    totalVoteCount?: number,
    questionMarkCount?: number,
  ): JudgeResult {
    const actualTotalVotes = totalVoteCount ?? numericVotes.length;
    const actualQuestionMarks = questionMarkCount ?? 0;

    if (numericVotes.length === 0) {
      const reasoning =
        actualQuestionMarks > 0
          ? `No numeric votes to analyze (${actualQuestionMarks} "?" vote${actualQuestionMarks > 1 ? "s" : ""})`
          : "No votes to analyze";
      return {
        score: null,
        confidence: "low",
        needsDiscussion: actualQuestionMarks > 0,
        reasoning,
      };
    }

    if (numericVotes.length === 1) {
      const reasoning =
        actualQuestionMarks > 0
          ? `Only one numeric vote (${actualQuestionMarks} "?" vote${actualQuestionMarks > 1 ? "s" : ""})`
          : "No consensus possible";
      return {
        score: numericVotes[0],
        confidence: "low",
        needsDiscussion: actualQuestionMarks > 0,
        reasoning,
      };
    }

    const sortedVotes = [...numericVotes].sort((a, b) => a - b);
    const distribution = this.getVoteDistribution(numericVotes);
    const stats = this.calculateBasicStats(sortedVotes);

    const context = {
      totalVoteCount: actualTotalVotes,
      questionMarkCount: actualQuestionMarks,
      numericVoteCount: numericVotes.length,
    };

    switch (algorithm) {
      case "smartConsensus":
        return this.smartConsensus(
          sortedVotes,
          distribution,
          stats,
          validOptions,
          context,
        );

      case "conservativeMode":
        return this.conservativeMode(sortedVotes, stats, validOptions, context);

      case "optimisticMode":
        return this.optimisticMode(sortedVotes, stats, validOptions, context);

      case "simpleAverage":
        return this.simpleAverage(stats, validOptions, context);

      default:
        return this.smartConsensus(
          sortedVotes,
          distribution,
          stats,
          validOptions,
          context,
        );
    }
  }

  private getVoteDistribution(votes: number[]): Record<number, number> {
    const distribution: Record<number, number> = {};
    votes.forEach((vote) => {
      distribution[vote] = (distribution[vote] || 0) + 1;
    });
    return distribution;
  }

  private calculateBasicStats(sortedVotes: number[]) {
    const median =
      sortedVotes.length % 2 === 0
        ? (sortedVotes[sortedVotes.length / 2 - 1] +
            sortedVotes[sortedVotes.length / 2]) /
          2
        : sortedVotes[Math.floor(sortedVotes.length / 2)];

    const mean =
      sortedVotes.reduce((sum, vote) => sum + vote, 0) / sortedVotes.length;
    const min = sortedVotes[0];
    const max = sortedVotes[sortedVotes.length - 1];
    const range = max - min;

    return { median, mean, min, max, range };
  }

  private smartConsensus(
    sortedVotes: number[],
    distribution: Record<number, number>,
    stats: any,
    validOptions: number[],
    context?: {
      totalVoteCount: number;
      questionMarkCount: number;
      numericVoteCount: number;
    },
  ): JudgeResult {
    const totalVotes = sortedVotes.length;
    const questionMarks = context?.questionMarkCount ?? 0;
    const actualTotal = context?.totalVoteCount ?? totalVotes;

    const maxCount = Math.max(...Object.values(distribution));
    const modes = Object.entries(distribution)
      .filter(([_, count]) => count === maxCount)
      .map(([vote, _]) => Number(vote));

    if (modes.length === 1 && maxCount / totalVotes >= 0.6) {
      const confidence =
        questionMarks > 0 && questionMarks / actualTotal > 0.2
          ? "medium"
          : "high";
      const reasoning =
        questionMarks > 0
          ? `Strong consensus: ${maxCount}/${totalVotes} voted for ${modes[0]} (${questionMarks} "?" vote${questionMarks > 1 ? "s" : ""})`
          : `Strong consensus: ${maxCount}/${totalVotes} voted for ${modes[0]}`;

      return {
        score: modes[0],
        confidence,
        needsDiscussion: questionMarks > 0 && questionMarks / actualTotal > 0.3,
        reasoning,
      };
    }

    // Check for adjacent consensus (majority within one step)
    const adjacentGroups = this.findAdjacentGroups(distribution, validOptions);
    const bestGroup = adjacentGroups.reduce(
      (best, group) => (group.totalVotes > best.totalVotes ? group : best),
      { values: [], totalVotes: 0 },
    );

    if (bestGroup.totalVotes / totalVotes >= 0.7) {
      const weightedAvg =
        bestGroup.values.reduce(
          (sum, val) => sum + val * distribution[val],
          0,
        ) / bestGroup.totalVotes;

      const closestValid = findClosestOption(weightedAvg, validOptions);

      return {
        score: closestValid,
        confidence: "medium",
        needsDiscussion: false,
        reasoning: `Adjacent consensus: ${bestGroup.totalVotes}/${totalVotes} votes clustered around ${closestValid}`,
      };
    }

    if (stats.range > this.getMaxReasonableRange(validOptions)) {
      return {
        score: Math.round(stats.median),
        confidence: "low",
        needsDiscussion: true,
        reasoning: `Wide spread (${stats.min}-${stats.max}) suggests different understanding of requirements`,
      };
    }

    const closestValid = findClosestOption(stats.median, validOptions);
    return {
      score: closestValid,
      confidence: "medium",
      needsDiscussion: stats.range > stats.median * 0.5,
      reasoning: `Moderate spread - using median (${closestValid})`,
    };
  }

  private conservativeMode(
    sortedVotes: number[],
    stats: any,
    validOptions: number[],
    context?: {
      totalVoteCount: number;
      questionMarkCount: number;
      numericVoteCount: number;
    },
  ): JudgeResult {
    const p75Index = Math.ceil(sortedVotes.length * 0.75) - 1;
    const p75 = sortedVotes[p75Index];

    const closestValid = findClosestOption(p75, validOptions);

    const questionMarks = context?.questionMarkCount ?? 0;
    const baseConfidence =
      stats.range <= stats.median * 0.3
        ? "high"
        : stats.range <= stats.median * 0.8
          ? "medium"
          : "low";

    const confidence =
      questionMarks > 0 && baseConfidence === "high"
        ? "medium"
        : baseConfidence;

    const reasoning =
      questionMarks > 0
        ? `Conservative estimate using 75th percentile (${closestValid}) to account for potential complexity (${questionMarks} "?" vote${questionMarks > 1 ? "s" : ""})`
        : `Conservative estimate using 75th percentile (${closestValid}) to account for potential complexity`;

    return {
      score: closestValid,
      confidence,
      needsDiscussion: confidence === "low" || questionMarks > 0,
      reasoning,
    };
  }

  private optimisticMode(
    sortedVotes: number[],
    stats: any,
    validOptions: number[],
    context?: {
      totalVoteCount: number;
      questionMarkCount: number;
      numericVoteCount: number;
    },
  ): JudgeResult {
    const p25Index = Math.floor(sortedVotes.length * 0.25);
    const p25 = sortedVotes[p25Index];

    const closestValid = findClosestOption(p25, validOptions);

    const questionMarks = context?.questionMarkCount ?? 0;
    const baseConfidence =
      stats.range <= stats.median * 0.3
        ? "high"
        : stats.range <= stats.median * 0.8
          ? "medium"
          : "low";

    const confidence =
      questionMarks > 0 && baseConfidence === "high"
        ? "medium"
        : baseConfidence;

    const reasoning =
      questionMarks > 0
        ? `Optimistic estimate using 25th percentile (${closestValid}) assuming team efficiency (${questionMarks} "?" vote${questionMarks > 1 ? "s" : ""})`
        : `Optimistic estimate using 25th percentile (${closestValid}) assuming team efficiency`;

    return {
      score: closestValid,
      confidence,
      needsDiscussion: confidence === "low" || questionMarks > 0,
      reasoning,
    };
  }

  private simpleAverage(
    stats: any,
    validOptions: number[],
    context?: {
      totalVoteCount: number;
      questionMarkCount: number;
      numericVoteCount: number;
    },
  ): JudgeResult {
    const closestValid = findClosestOption(stats.mean, validOptions);

    const questionMarks = context?.questionMarkCount ?? 0;
    const baseConfidence =
      stats.range <= stats.mean * 0.2
        ? "high"
        : stats.range <= stats.mean * 0.6
          ? "medium"
          : "low";

    const confidence =
      questionMarks > 0 && baseConfidence === "high"
        ? "medium"
        : baseConfidence;

    const reasoning =
      questionMarks > 0
        ? `Simple average (${closestValid}) of all votes (${questionMarks} "?" vote${questionMarks > 1 ? "s" : ""})`
        : `Simple average (${closestValid}) of all votes`;

    return {
      score: closestValid,
      confidence,
      needsDiscussion: confidence === "low" || questionMarks > 0,
      reasoning,
    };
  }

  private findAdjacentGroups(
    distribution: Record<number, number>,
    validOptions: number[],
  ) {
    const sortedOptions = [...validOptions].sort((a, b) => a - b);
    const groups: { values: number[]; totalVotes: number }[] = [];

    for (let i = 0; i < sortedOptions.length; i++) {
      const current = sortedOptions[i];
      const next = sortedOptions[i + 1];

      if (distribution[current]) {
        let group = { values: [current], totalVotes: distribution[current] };

        // Add adjacent values if they exist
        if (next && distribution[next]) {
          group.values.push(next);
          group.totalVotes += distribution[next];
        }

        groups.push(group);
      }
    }

    // If no groups found, return an empty group to avoid errors
    if (groups.length === 0) {
      return [{ values: [], totalVotes: 0 }];
    }

    return groups;
  }

  private getMaxReasonableRange(validOptions: number[]): number {
    // Consider a range "wide" if it spans more than 3 fibonacci-style steps
    if (validOptions.length === 0) return 10;

    const sorted = [...validOptions].sort((a, b) => a - b);
    const midIndex = Math.floor(sorted.length / 2);
    return sorted[midIndex] * 2; // Reasonable range is 2x the median option
  }
}
