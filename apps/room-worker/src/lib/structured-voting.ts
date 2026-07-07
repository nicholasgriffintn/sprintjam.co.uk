/**
 * Weighted structured voting system with detailed examples
 *
 * Formula: complexity×100/4×0.35 + (4-confidence)×100/4×0.25 + volume×100/4×0.25 + unknowns×100/2×0.15
 *
 * ┌─────────────┬─────────────┬─────────────┬──────────┬───────────┬─────────────┬──────────────────────────────┐
 * │ Story Points│ Complexity  │ Confidence* │ Volume   │ Unknowns  │ Percentage  │ Example Scenario             │
 * ├─────────────┼─────────────┼─────────────┼──────────┼───────────┼─────────────┼──────────────────────────────┤
 * │     1pt     │      0      │      4      │     0    │     0     │    0.0%     │ Trivial config change        │
 * │     1pt     │      1      │      4      │     0    │     0     │    8.8%     │ Simple same-app fix          │
 * │     1pt     │      1      │      3      │     1    │     0     │   21.3%     │ Small familiar feature       │
 * │     3pt     │      2      │      4      │     0    │     0     │   17.5%*    │ *unknowns=1 rule → min 3pt   │
 * │     3pt     │      1      │      3      │     1    │     1     │   28.8%     │ Moderate task, some unknowns │
 * │     3pt     │      2      │      2      │     0    │     0     │   30.0%     │ Medium complexity, confident │
 * │     5pt     │      3      │      2      │     2    │     0     │   51.3%     │ Complex cross-repo work      │
 * │     5pt     │      2      │      2      │     3    │     1     │   56.3%     │ High volume, some unknowns   │
 * │     8pt     │      0      │      4      │     0    │     2     │   15.0%*    │ *unknowns=2 rule → min 8pt   │
 * │     8pt     │      0      │      4      │     4    │     0     │   25.0%*    │ *volume=4 rule → min 8pt     │
 * │     8pt     │      4      │      0      │     2    │     1     │   80.0%     │ Cross-team, unfamiliar, hard │
 * │     8pt     │      4      │      0      │     4    │     2     │  100.0%     │ Maximum complexity scenario  │
 * └─────────────┴─────────────┴─────────────┴──────────┴───────────┴─────────────┴──────────────────────────────┘
 *
 * Weighted breakdown examples:
 * - Complexity=2: 2×100/4×0.35 = 17.5%
 * - Confidence=1 (low confidence): (4-1)×100/4×0.25 = 18.75%
 * - Confidence=4 (very confident): (4-4)×100/4×0.25 = 0%
 * - Volume=3: 3×100/4×0.25 = 18.75%
 * - Unknowns=1: 1×100/2×0.15 = 7.5%
 * Total (example above): 17.5 + 6.25 + 18.75 + 7.5 = 50.0% → 5pt
 *
 * *Confidence column uses 4 = very confident and 0 = no confidence. The calculation inverts that score internally.
 *
 * Story point ranges:
 * - 1pt: 0-34% (unless conversion rules apply)
 * - 3pt: 35-49%
 * - 5pt: 50-79%
 * - 8pt: 80%+ or conversion rules (unknowns=2, unknowns=1, volume=4)
 *
 * Conversion rules override percentage calculation:
 * - unknowns=2 → minimum 8pt (too many implementation unknowns)
 * - unknowns=1 → minimum 3pt (some implementation unknowns)
 * - volume=4 → minimum 8pt (extensive work required)
 */

import type { VotingCriterion, StructuredVote } from "@sprintjam/types";
import { getDefaultVotingCriteria } from "@sprintjam/utils";

function computeWeightedScoreAndRules(
  criteriaScores: Record<string, number>,
  votingCriteria: VotingCriterion[] = getDefaultVotingCriteria(),
): {
  weightedScore: number;
  finalScore: number;
  appliedConversionRules: string[];
  contributions: {
    id: string;
    weightPercent: number;
    score: number;
    maxScore: number;
    contributionPercent: number;
  }[];
} {
  const criteria =
    votingCriteria.length > 0 ? votingCriteria : getDefaultVotingCriteria();
  const totalWeight = criteria.reduce(
    (total, criterion) => total + (criterion.weight ?? 0),
    0,
  );
  const equalWeight = criteria.length > 0 ? 1 / criteria.length : 0;

  const clampScore = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  const contributions = criteria.map((criterion) => {
    const score = clampScore(
      criteriaScores[criterion.id] ?? criterion.minScore,
      criterion.minScore,
      criterion.maxScore,
    );
    const range = criterion.maxScore - criterion.minScore;
    const normalizedScore =
      range <= 0 ? 0 : (score - criterion.minScore) / range;
    const contributionRatio =
      criterion.scoringDirection === "inverse"
        ? 1 - normalizedScore
        : normalizedScore;
    const weight =
      totalWeight > 0 ? (criterion.weight ?? 0) / totalWeight : equalWeight;
    const weightPercent = weight * 100;

    return {
      id: criterion.id,
      weightPercent,
      score,
      maxScore: criterion.maxScore,
      contributionPercent: contributionRatio * weightPercent,
    };
  });

  const weightedScore = contributions.reduce(
    (total, contribution) => total + contribution.contributionPercent,
    0,
  );

  const appliedConversionRules: string[] = [];
  let finalScore = weightedScore;

  for (const criterion of criteria) {
    const score = contributions.find(
      (contribution) => contribution.id === criterion.id,
    )?.score;

    for (const rule of criterion.conversionRules ?? []) {
      if (score === rule.score) {
        finalScore = Math.max(finalScore, rule.minimumPercentageScore);
        appliedConversionRules.push(rule.label);
      }
    }
  }

  return { weightedScore, finalScore, appliedConversionRules, contributions };
}

export function calculateStoryPointsFromStructuredVote(
  criteriaScores: Record<string, number>,
  votingCriteria: VotingCriterion[] = getDefaultVotingCriteria(),
): string | number | undefined {
  const { finalScore } = computeWeightedScoreAndRules(
    criteriaScores,
    votingCriteria,
  );

  const max1ptScore = 35;
  const max3ptScore = 50;
  const max5ptScore = 80;

  if (finalScore < max1ptScore) {
    return 1;
  } else if (finalScore < max3ptScore) {
    return 3;
  } else if (finalScore < max5ptScore) {
    return 5;
  } else {
    return 8;
  }
}

export function createStructuredVote(
  criteriaScores: Record<string, number>,
  votingCriteria: VotingCriterion[] = getDefaultVotingCriteria(),
): StructuredVote {
  const calculatedStoryPoints =
    calculateStoryPointsFromStructuredVote(criteriaScores, votingCriteria);
  const { weightedScore, appliedConversionRules, contributions } =
    computeWeightedScoreAndRules(criteriaScores, votingCriteria);

  return {
    criteriaScores,
    calculatedStoryPoints,
    percentageScore: weightedScore,
    appliedConversionRules,
    contributions,
  };
}

export function isStructuredVote(vote: unknown): vote is StructuredVote {
  return typeof vote === "object" && vote !== null && "criteriaScores" in vote;
}

export function isStructuredVoteComplete(
  criteriaScores: Record<string, number>,
  votingCriteria: VotingCriterion[] = getDefaultVotingCriteria(),
): boolean {
  return votingCriteria.every((criterion) => {
    const score = criteriaScores[criterion.id];
    return typeof score === "number";
  });
}
