import type { StructuredVote, VoteValue } from '../types';

/**
 * Calculate story points from structured vote using weighted formula
 * This should match the backend implementation exactly
 */
function calculateStoryPointsFromStructuredVote(
  criteriaScores: Record<string, number>,
): VoteValue {
  const complexity = criteriaScores.complexity ?? 0;
  const confidence = criteriaScores.confidence ?? 0;
  const volume = criteriaScores.volume ?? 0;
  const unknowns = criteriaScores.unknowns ?? 0;

  // Calculate weighted score using the formula:
  // complexity * 100/4 * 0.35 + confidence * 100/4 * 0.25 + volume * 100/4 * 0.25 + unknowns * 100/2 * 0.15
  const weightedScore = 
    (complexity * 100 / 4 * 0.35) +
    (confidence * 100 / 4 * 0.25) +
    (volume * 100 / 4 * 0.25) +
    (unknowns * 100 / 2 * 0.15);

  // Apply conversion rules
  let finalScore = weightedScore;
  
  // If unknowns = 2, minimum estimation is 8
  if (unknowns === 2) {
    finalScore = Math.max(finalScore, 80); // 80% maps to story point 8
  }
  // If unknowns = 1, minimum estimation is 3
  else if (unknowns === 1) {
    finalScore = Math.max(finalScore, 35); // 35% maps to story point 3
  }
  
  // If volume = 4, minimum estimation is 8
  if (volume === 4) {
    finalScore = Math.max(finalScore, 80); // 80% maps to story point 8
  }

  // Map percentage score to story points
  // 1: 0-2 (0-34%), 3: 3-7 (35-49%), 5: 8-11 (50-79%), 8: 12+ (80%+)
  if (finalScore < 35) {
    return 1;
  } else if (finalScore < 50) {
    return 3;
  } else if (finalScore < 80) {
    return 5;
  } else {
    return 8;
  }
}

/**
 * Get the calculated percentage score for display purposes
 */
export function getWeightedPercentageScore(criteriaScores: Record<string, number>): number {
  const complexity = criteriaScores.complexity ?? 0;
  const confidence = criteriaScores.confidence ?? 0;
  const volume = criteriaScores.volume ?? 0;
  const unknowns = criteriaScores.unknowns ?? 0;

  return (complexity * 100 / 4 * 0.35) +
    (confidence * 100 / 4 * 0.25) +
    (volume * 100 / 4 * 0.25) +
    (unknowns * 100 / 2 * 0.15);
}

/**
 * Create a structured vote object with calculated story points
 */
export function createStructuredVote(
  criteriaScores: Record<string, number>,
): StructuredVote {
  const calculatedStoryPoints = calculateStoryPointsFromStructuredVote(criteriaScores);
  
  return {
    criteriaScores,
    calculatedStoryPoints
  };
}
