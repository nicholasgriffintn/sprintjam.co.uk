import type { VotingCriterion, ScoringRule, StructuredVote } from '../types';

export function calculateStoryPointsFromStructuredVote(
  criteriaScores: Record<string, number>,
  scoringRules: ScoringRule[]
): string | number | undefined {
  const totalScore = Object.values(criteriaScores).reduce((sum, score) => sum + score, 0);

  for (const rule of scoringRules) {
    let matchesRule = true;

    for (const condition of rule.conditions) {
      const score = criteriaScores[condition.criterionId];
      if (score === undefined || score < condition.minScore || score > condition.maxScore) {
        matchesRule = false;
        break;
      }
    }

    if (matchesRule && (rule.maxTotalScore === undefined || totalScore <= rule.maxTotalScore)) {
      return rule.storyPoints;
    }
  }

  return undefined;
}

export function createStructuredVote(
  criteriaScores: Record<string, number>,
  scoringRules: ScoringRule[]
): StructuredVote {
  const calculatedStoryPoints = calculateStoryPointsFromStructuredVote(criteriaScores, scoringRules);
  
  return {
    criteriaScores,
    calculatedStoryPoints
  };
}

export function getDefaultVotingCriteria(): VotingCriterion[] {
  return [
    {
      id: 'complexity',
      name: 'Complexity',
      description: 'Technical complexity of the task',
      minScore: 0,
      maxScore: 5
    },
    {
      id: 'risks',
      name: 'Risks',
      description: 'Potential risks and uncertainties',
      minScore: 0,
      maxScore: 5
    },
    {
      id: 'unknowns',
      name: 'Unknowns',
      description: 'Unknown factors (internal and external)',
      minScore: 0,
      maxScore: 5
    }
  ];
}

export function generateScoringRulesFromEstimateOptions(estimateOptions: (string | number)[]): ScoringRule[] {
  /**
   * Generates scoring rules that map criteria combinations to story points
   * 
   * Example with [1,2,3,5,8,13,21]:
   * ┌─────────────┬─────────────┬──────────┬───────────┬──────────────────────────────┐
   * │ Story Points │ Complexity  │ Risks    │ Unknowns  │ Logic                        │
   * ├────────────┼────────────┼─────────┼──────────┼────────────────────────── ─┤
   * │     1pt     │      0      │    0     │     0     │ All zeros only               │
   * │     2pt     │    0-2      │   0-2    │     0     │ Low complexity/risks, none   │
   * │     3pt     │    0-3      │   0-3    │    0-1    │ Moderate + minimal unknowns  │
   * │     5pt     │    0-4      │   0-4    │    0-1    │ Higher complexity/risks      │
   * │     8pt     │    0-5      │   0-5    │    0-2    │ High + some unknowns         │
   * │    13pt     │    0-5      │   0-5    │    0-3    │ Full range + more unknowns   │
   * │    21pt     │    0-5      │   0-5    │    0-4    │ Maximum uncertainty allowed  │
   * └─────────────┴─────────────┴──────────┴───────────┴──────────────────────────────┘
   * 
   * Math breakdown:
   * - Complexity/Risks: Min(5, index + 1) → grows with story point position
   * - Unknowns: Min(5, floor(index * 0.8)) → slower growth, kicks in later
   * - MaxTotal: 2 + (index * 2) → prevents overly high total combinations
   */

  const numericOptions = estimateOptions
    .filter(option => !Number.isNaN(Number(option)) && option !== '?')
    .map(Number)
    .sort((a, b) => a - b);

  if (numericOptions.length === 0) {
    return getDefaultScoringRules();
  }

  const rules: ScoringRule[] = [];

  numericOptions.forEach((points, index) => {
    if (points === 0 || points === 1) {
      // Lowest story points: all criteria must be 0
      rules.push({
        storyPoints: points,
        conditions: [
          { criterionId: 'complexity', minScore: 0, maxScore: 0 },
          { criterionId: 'risks', minScore: 0, maxScore: 0 },
          { criterionId: 'unknowns', minScore: 0, maxScore: 0 }
        ]
      });
    } else {
      // Progressive scoring: higher story points allow higher individual criteria
      // Complexity & Risks: grow steadily with story point index
      const complexityMax = Math.min(5, index + 1);  // index 1→2, 2→3, 3→4, 4→5, 5+→5
      const risksMax = Math.min(5, index + 1);        // Same as complexity
      
      // Unknowns: grow very conservatively - most work should be reasonably understood
      const unknownsMax = Math.min(5, Math.max(0, Math.floor(index / 2))); // index 1→0, 2→1, 3→1, 4→2, 5→2, 6→3
      
      // Total score cap: allows reasonable combinations but prevents extreme edge cases
      const maxTotal = Math.min(15, 1 + index * 2); // index 1→3, 2→5, 3→7, 4→9, etc.

      rules.push({
        storyPoints: points,
        conditions: [
          { criterionId: 'complexity', minScore: 0, maxScore: complexityMax },
          { criterionId: 'risks', minScore: 0, maxScore: risksMax },
          { criterionId: 'unknowns', minScore: 0, maxScore: unknownsMax }
        ],
        maxTotalScore: maxTotal
      });
    }
  });

  return rules;
}

export function getDefaultScoringRules(): ScoringRule[] {
  return [
    {
      storyPoints: 1,
      conditions: [
        { criterionId: 'complexity', minScore: 0, maxScore: 0 },
        { criterionId: 'risks', minScore: 0, maxScore: 0 },
        { criterionId: 'unknowns', minScore: 0, maxScore: 0 }
      ]
    },
    {
      storyPoints: 2,
      conditions: [
        { criterionId: 'complexity', minScore: 0, maxScore: 2 },
        { criterionId: 'risks', minScore: 0, maxScore: 2 },
        { criterionId: 'unknowns', minScore: 0, maxScore: 0 }
      ],
      maxTotalScore: 2
    },
    {
      storyPoints: 3,
      conditions: [
        { criterionId: 'complexity', minScore: 0, maxScore: 3 },
        { criterionId: 'risks', minScore: 0, maxScore: 3 },
        { criterionId: 'unknowns', minScore: 0, maxScore: 1 }
      ]
    },
    {
      storyPoints: 5,
      conditions: [
        { criterionId: 'complexity', minScore: 2, maxScore: 4 },
        { criterionId: 'risks', minScore: 2, maxScore: 4 },
        { criterionId: 'unknowns', minScore: 0, maxScore: 2 }
      ]
    },
    {
      storyPoints: 8,
      conditions: [
        { criterionId: 'complexity', minScore: 3, maxScore: 5 },
        { criterionId: 'risks', minScore: 3, maxScore: 5 },
        { criterionId: 'unknowns', minScore: 0, maxScore: 5 }
      ]
    }
  ];
}

export function isStructuredVote(vote: unknown): vote is StructuredVote {
  return typeof vote === 'object' && vote !== null && 'criteriaScores' in vote;
}
