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

import type {
  VotingCriterion,
  StructuredVote,
  JudgeStructuredBreakdown,
} from "../types";

function computeWeightedScoreAndRules(criteriaScores: Record<string, number>): {
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
  const maxComplexityScore = 4;
  const maxConfidenceScore = 4;
  const maxVolumeScore = 4;
  const maxUnknownsScore = 2;

  const clampScore = (value: number, max: number) =>
    Math.min(Math.max(value, 0), max);

  const complexity = clampScore(
    criteriaScores.complexity ?? 0,
    maxComplexityScore,
  );
  const confidenceInput = clampScore(
    criteriaScores.confidence ?? 0,
    maxConfidenceScore,
  );
  const volume = clampScore(criteriaScores.volume ?? 0, maxVolumeScore);
  const unknowns = clampScore(criteriaScores.unknowns ?? 0, maxUnknownsScore);

  const complexityWeight = 0.35;
  const confidenceWeight = 0.25;
  const volumeWeight = 0.25;
  const unknownsWeight = 0.15;

  const complexityContribution =
    (complexity / maxComplexityScore) * (complexityWeight * 100);
  const confidenceDeficit = maxConfidenceScore - confidenceInput;
  const confidenceContribution =
    (confidenceDeficit / maxConfidenceScore) * (confidenceWeight * 100);
  const volumeContribution = (volume / maxVolumeScore) * (volumeWeight * 100);
  const unknownsContribution =
    (unknowns / maxUnknownsScore) * (unknownsWeight * 100);

  const weightedScore =
    complexityContribution +
    confidenceContribution +
    volumeContribution +
    unknownsContribution;

  const contributions = [
    {
      id: "complexity",
      weightPercent: complexityWeight * 100,
      score: complexity,
      maxScore: maxComplexityScore,
      contributionPercent: complexityContribution,
    },
    {
      id: "confidence",
      weightPercent: confidenceWeight * 100,
      score: confidenceInput,
      maxScore: maxConfidenceScore,
      contributionPercent: confidenceContribution,
    },
    {
      id: "volume",
      weightPercent: volumeWeight * 100,
      score: volume,
      maxScore: maxVolumeScore,
      contributionPercent: volumeContribution,
    },
    {
      id: "unknowns",
      weightPercent: unknownsWeight * 100,
      score: unknowns,
      maxScore: maxUnknownsScore,
      contributionPercent: unknownsContribution,
    },
  ];

  const appliedConversionRules: string[] = [];
  let finalScore = weightedScore;

  const minUnknowns2Score = 80;
  const minUnknowns1Score = 35;
  const minVolume4Score = 80;

  if (unknowns === 2) {
    finalScore = Math.max(finalScore, minUnknowns2Score);
    appliedConversionRules.push("Unknowns=2 → minimum 8pt");
  } else if (unknowns === 1) {
    finalScore = Math.max(finalScore, minUnknowns1Score);
    appliedConversionRules.push("Unknowns=1 → minimum 3pt");
  }

  if (volume === 4) {
    finalScore = Math.max(finalScore, minVolume4Score);
    appliedConversionRules.push("Volume=4 → minimum 8pt");
  }

  return { weightedScore, finalScore, appliedConversionRules, contributions };
}

export function calculateStoryPointsFromStructuredVote(
  criteriaScores: Record<string, number>,
): string | number | undefined {
  const { finalScore } = computeWeightedScoreAndRules(criteriaScores);
  return convertScoreToStoryPoints(finalScore);
}

function convertScoreToStoryPoints(score: number): number {
  const max1ptScore = 35;
  const max3ptScore = 50;
  const max5ptScore = 80;

  if (score < max1ptScore) {
    return 1;
  }
  if (score < max3ptScore) {
    return 3;
  }
  if (score < max5ptScore) {
    return 5;
  }
  return 8;
}

export function createStructuredVote(
  criteriaScores: Record<string, number>,
): StructuredVote {
  const calculatedStoryPoints =
    calculateStoryPointsFromStructuredVote(criteriaScores);
  const { weightedScore, appliedConversionRules, contributions } =
    computeWeightedScoreAndRules(criteriaScores);

  return {
    criteriaScores,
    calculatedStoryPoints,
    percentageScore: weightedScore,
    appliedConversionRules,
    contributions,
  };
}

export function buildJudgeStructuredBreakdown(
  structuredVotes?: Record<string, StructuredVote>,
  criteria?: VotingCriterion[],
): JudgeStructuredBreakdown | undefined {
  if (!structuredVotes) {
    return undefined;
  }

  const votes = Object.values(structuredVotes).filter(
    (vote) =>
      vote &&
      vote.criteriaScores &&
      Object.keys(vote.criteriaScores).length > 0,
  );

  if (votes.length === 0) {
    return undefined;
  }

  type ContributionAggregate = {
    label: string;
    weightPercent: number;
    maxScore: number;
    order: number;
    sumScore: number;
    sumContributionPercent: number;
  };

  const criteriaMeta = new Map(
    (criteria ?? []).map((criterion, index) => [
      criterion.id,
      {
        label: criterion.name,
        order: index,
        maxScore: criterion.maxScore,
      },
    ]),
  );

  const contributionMap = new Map<string, ContributionAggregate>();
  const ruleUsage = new Map<string, number>();
  const storyPointCounts = new Map<number, number>();

  let weightedScoreTotal = 0;
  let adjustedScoreTotal = 0;
  let storyPointTotal = 0;

  votes.forEach((vote) => {
    const { weightedScore, finalScore, appliedConversionRules, contributions } =
      computeWeightedScoreAndRules(vote.criteriaScores);

    weightedScoreTotal += weightedScore;
    adjustedScoreTotal += finalScore;

    const storyPoints = convertScoreToStoryPoints(finalScore);
    storyPointTotal += storyPoints;
    storyPointCounts.set(
      storyPoints,
      (storyPointCounts.get(storyPoints) ?? 0) + 1,
    );

    contributions.forEach((contribution) => {
      const meta = criteriaMeta.get(contribution.id);
      const existing = contributionMap.get(contribution.id);

      if (!existing) {
        contributionMap.set(contribution.id, {
          label: meta?.label ?? contribution.id,
          weightPercent: contribution.weightPercent,
          maxScore: meta?.maxScore ?? contribution.maxScore,
          order: meta?.order ?? Number.MAX_SAFE_INTEGER,
          sumScore: contribution.score,
          sumContributionPercent: contribution.contributionPercent,
        });
      } else {
        existing.sumScore += contribution.score;
        existing.sumContributionPercent += contribution.contributionPercent;
      }
    });

    appliedConversionRules.forEach((rule) => {
      ruleUsage.set(rule, (ruleUsage.get(rule) ?? 0) + 1);
    });
  });

  const totalVotes = votes.length;
  const contributions = Array.from(contributionMap.entries())
    .map(([id, entry]) => ({
      id,
      label: entry.label,
      weightPercent: entry.weightPercent,
      averageScore: entry.sumScore / totalVotes,
      maxScore: entry.maxScore,
      averageContributionPercent: entry.sumContributionPercent / totalVotes,
      order: entry.order,
    }))
    .sort((a, b) => {
      if (a.order === b.order) {
        return a.label.localeCompare(b.label);
      }
      return a.order - b.order;
    })
    .map(({ order, ...rest }) => rest);

  const storyPointDistribution = Array.from(storyPointCounts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([storyPoints, count]) => ({
      storyPoints,
      count,
      percentage: (count / totalVotes) * 100,
    }));

  const conversionRules = Array.from(ruleUsage.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([rule, count]) => ({
      rule,
      count,
      percentage: (count / totalVotes) * 100,
    }));

  const averageWeightedScore = weightedScoreTotal / totalVotes;
  const averageAdjustedScore = adjustedScoreTotal / totalVotes;
  const weightedStoryPointEstimate = convertScoreToStoryPoints(
    averageAdjustedScore,
  );
  const averageStoryPoints = storyPointTotal / totalVotes;

  return {
    totalVotes,
    averageWeightedScore,
    averageAdjustedScore,
    weightedStoryPointEstimate,
    averageStoryPoints,
    storyPointDistribution,
    conversionRules,
    contributions,
  };
}

export function getDefaultVotingCriteria(): VotingCriterion[] {
  return [
    {
      id: "complexity",
      name: "Complexity",
      description:
        "Level of logic and coordination (0: same app, 3: cross repo, 5: cross team)",
      minScore: 0,
      maxScore: 4,
    },
    {
      id: "confidence",
      name: "Individual Confidence",
      description:
        "Your confidence in this area (0: no confidence, 4: very confident)",
      minScore: 0,
      maxScore: 4,
    },
    {
      id: "volume",
      name: "Volume",
      description: "Amount of work required (0: minimal, 4: extensive)",
      minScore: 0,
      maxScore: 4,
    },
    {
      id: "unknowns",
      name: "Unknowns",
      description: "Implementation unknowns (0: none, 1: some, 2: too many)",
      minScore: 0,
      maxScore: 2,
    },
  ];
}

export function isStructuredVote(vote: unknown): vote is StructuredVote {
  return typeof vote === "object" && vote !== null && "criteriaScores" in vote;
}
