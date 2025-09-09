import type { ScoringRule, StructuredVote, VoteValue } from '../types';

/**
 * Calculate story points from structured vote using server-provided scoring rules
 * This should match the backend implementation exactly
 */
function calculateStoryPointsFromStructuredVote(
  criteriaScores: Record<string, number>,
  scoringRules: ScoringRule[]
): VoteValue {
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

  return '?';
}

/**
 * Create a structured vote object with calculated story points
 */
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
