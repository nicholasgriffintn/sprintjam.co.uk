/**
  * Weighted structured voting system with detailed examples
  * 
  * Formula: complexity×100/4×0.35 + confidence×100/4×0.25 + volume×100/4×0.25 + unknowns×100/2×0.15
  * 
  * ┌─────────────┬─────────────┬─────────────┬──────────┬───────────┬─────────────┬──────────────────────────────┐
  * │ Story Points│ Complexity  │ Confidence  │ Volume   │ Unknowns  │ Percentage  │ Example Scenario             │
  * ├─────────────┼─────────────┼─────────────┼──────────┼───────────┼─────────────┼──────────────────────────────┤
  * │     1pt     │      0      │      0      │     0    │     0     │    0.0%     │ Trivial config change        │
  * │     1pt     │      1      │      0      │     0    │     0     │    8.8%     │ Simple same-app fix          │
  * │     1pt     │      1      │      1      │     1    │     0     │   29.0%     │ Small familiar feature       │
  * │     3pt     │      2      │      0      │     0    │     0     │   17.5%*    │ *unknowns=1 rule → min 3pt   │
  * │     3pt     │      1      │      1      │     1    │     1     │   36.5%     │ Moderate task, some unknowns │
  * │     3pt     │      2      │      2      │     0    │     0     │   42.5%     │ Medium complexity, confident │
  * │     5pt     │      3      │      2      │     2    │     0     │   64.0%     │ Complex cross-repo work      │
  * │     5pt     │      2      │      2      │     3    │     1     │   61.3%     │ High volume, some unknowns   │
  * │     8pt     │      0      │      0      │     0    │     2     │   15.0%*    │ *unknowns=2 rule → min 8pt   │
  * │     8pt     │      0      │      0      │     4    │     0     │   25.0%*    │ *volume=4 rule → min 8pt     │
  * │     8pt     │      4      │      4      │     2    │     1     │   88.8%     │ Cross-team, unfamiliar, hard │
  * │     8pt     │      4      │      4      │     4    │     2     │  100.0%     │ Maximum complexity scenario  │
  * └─────────────┴─────────────┴─────────────┴──────────┴───────────┴─────────────┴──────────────────────────────┘
  * 
  * Weighted breakdown examples:
  * - Complexity=2: 2×100/4×0.35 = 17.5%
  * - Confidence=1: 1×100/4×0.25 = 6.25% 
  * - Volume=3: 3×100/4×0.25 = 18.75%
  * - Unknowns=1: 1×100/2×0.15 = 7.5%
  * Total: 17.5 + 6.25 + 18.75 + 7.5 = 50.0% → 5pt
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

import type { VotingCriterion, StructuredVote } from '../types';

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
  const complexity = criteriaScores.complexity ?? 0;
  const confidence = criteriaScores.confidence ?? 0;
  const volume = criteriaScores.volume ?? 0;
  const unknowns = criteriaScores.unknowns ?? 0;

  const maxComplexityScore = 4;
  const maxConfidenceScore = 4;
  const maxVolumeScore = 4;
  const maxUnknownsScore = 2;

  const complexityWeight = 0.35;
  const confidenceWeight = 0.25;
  const volumeWeight = 0.25;
  const unknownsWeight = 0.15;

  const complexityContribution = (complexity / maxComplexityScore) * (complexityWeight * 100);
  const confidenceContribution = (confidence / maxConfidenceScore) * (confidenceWeight * 100);
  const volumeContribution = (volume / maxVolumeScore) * (volumeWeight * 100);
  const unknownsContribution = (unknowns / maxUnknownsScore) * (unknownsWeight * 100);

  const weightedScore =
    complexityContribution +
    confidenceContribution +
    volumeContribution +
    unknownsContribution;

  const contributions = [
    { id: 'complexity', weightPercent: complexityWeight * 100, score: complexity, maxScore: maxComplexityScore, contributionPercent: complexityContribution },
    { id: 'confidence', weightPercent: confidenceWeight * 100, score: confidence, maxScore: maxConfidenceScore, contributionPercent: confidenceContribution },
    { id: 'volume', weightPercent: volumeWeight * 100, score: volume, maxScore: maxVolumeScore, contributionPercent: volumeContribution },
    { id: 'unknowns', weightPercent: unknownsWeight * 100, score: unknowns, maxScore: maxUnknownsScore, contributionPercent: unknownsContribution },
  ];

  const appliedConversionRules: string[] = [];
  let finalScore = weightedScore;

  const minUnknowns2Score = 80;
  const minUnknowns1Score = 35;
  const minVolume4Score = 80;

  if (unknowns === 2) {
    finalScore = Math.max(finalScore, minUnknowns2Score);
    appliedConversionRules.push('Unknowns=2 → minimum 8pt');
  } else if (unknowns === 1) {
    finalScore = Math.max(finalScore, minUnknowns1Score);
    appliedConversionRules.push('Unknowns=1 → minimum 3pt');
  }

  if (volume === 4) {
    finalScore = Math.max(finalScore, minVolume4Score);
    appliedConversionRules.push('Volume=4 → minimum 8pt');
  }

  return { weightedScore, finalScore, appliedConversionRules, contributions };
}

export function calculateStoryPointsFromStructuredVote(
  criteriaScores: Record<string, number>,
): string | number | undefined {
  const { finalScore } = computeWeightedScoreAndRules(criteriaScores);

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
): StructuredVote {
  const calculatedStoryPoints = calculateStoryPointsFromStructuredVote(criteriaScores);
  const { weightedScore, appliedConversionRules, contributions } = computeWeightedScoreAndRules(criteriaScores);

  return {
    criteriaScores,
    calculatedStoryPoints,
    percentageScore: weightedScore,
    appliedConversionRules,
    contributions,
  };
}

export function getDefaultVotingCriteria(): VotingCriterion[] {
  return [
    {
      id: 'complexity',
      name: 'Complexity',
      description: 'Level of logic and coordination (0: same app, 3: cross repo, 5: cross team)',
      minScore: 0,
      maxScore: 4
    },
    {
      id: 'confidence',
      name: 'Individual Confidence',
      description: 'Your confidence in this area (0: very familiar, 4: completely unfamiliar)',
      minScore: 0,
      maxScore: 4
    },
    {
      id: 'volume',
      name: 'Volume',
      description: 'Amount of work required (0: minimal, 4: extensive)',
      minScore: 0,
      maxScore: 4
    },
    {
      id: 'unknowns',
      name: 'Unknowns',
      description: 'Implementation unknowns (0: none, 1: some, 2: too many)',
      minScore: 0,
      maxScore: 2
    }
  ];
}

export function isStructuredVote(vote: unknown): vote is StructuredVote {
  return typeof vote === 'object' && vote !== null && 'criteriaScores' in vote;
}
