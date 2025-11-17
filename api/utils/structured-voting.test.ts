import { describe, it, expect } from 'vitest';
import {
  calculateStoryPointsFromStructuredVote,
  createStructuredVote,
  getDefaultVotingCriteria,
  isStructuredVote,
} from './structured-voting';

describe('Structured Voting Calculations', () => {
  describe('calculateStoryPointsFromStructuredVote', () => {
    it('returns 1pt for trivial tasks (0% score)', () => {
      const result = calculateStoryPointsFromStructuredVote({
        complexity: 0,
        confidence: 4,
        volume: 0,
        unknowns: 0,
      });
      expect(result).toBe(1);
    });

    it('returns 1pt for low scores (< 35%)', () => {
      const result = calculateStoryPointsFromStructuredVote({
        complexity: 1,
        confidence: 4,
        volume: 0,
        unknowns: 0,
      });

      expect(result).toBe(1);
    });

    it('returns 3pt for moderate scores (35-49%)', () => {
      const result = calculateStoryPointsFromStructuredVote({
        complexity: 2,
        confidence: 2,
        volume: 2,
        unknowns: 0,
      });
      expect(result).toBe(3);
    });

    it('returns 5pt for higher scores (50-79%)', () => {
      const result = calculateStoryPointsFromStructuredVote({
        complexity: 3,
        confidence: 2,
        volume: 2,
        unknowns: 0,
      });

      expect(result).toBe(5);
    });

    it('returns 8pt for maximum scores (80%+)', () => {
      const result = calculateStoryPointsFromStructuredVote({
        complexity: 4,
        confidence: 0,
        volume: 4,
        unknowns: 2,
      });

      expect(result).toBe(8);
    });

    describe('conversion rules', () => {
      it('applies unknowns=2 → minimum 8pt rule', () => {
        const result = calculateStoryPointsFromStructuredVote({
          complexity: 0,
          confidence: 0,
          volume: 0,
          unknowns: 2,
        });

        expect(result).toBe(8);
      });

      it('applies unknowns=1 → minimum 3pt rule', () => {
        const result = calculateStoryPointsFromStructuredVote({
          complexity: 1,
          confidence: 0,
          volume: 0,
          unknowns: 1,
        });

        expect(result).toBe(3);
      });

      it('applies volume=4 → minimum 8pt rule', () => {
        const result = calculateStoryPointsFromStructuredVote({
          complexity: 0,
          confidence: 0,
          volume: 4,
          unknowns: 0,
        });

        expect(result).toBe(8);
      });

      it('uses higher score when conversion rule not needed', () => {
        const result = calculateStoryPointsFromStructuredVote({
          complexity: 4,
          confidence: 0,
          volume: 2,
          unknowns: 1,
        });

        expect(result).toBe(8);
      });
    });
  });

  describe('createStructuredVote', () => {
    it('creates full structured vote with all metadata', () => {
      const vote = createStructuredVote({
        complexity: 2,
        confidence: 1,
        volume: 1,
        unknowns: 0,
      });

      expect(vote).toHaveProperty('criteriaScores');
      expect(vote).toHaveProperty('calculatedStoryPoints');
      expect(vote).toHaveProperty('percentageScore');
      expect(vote).toHaveProperty('appliedConversionRules');
      expect(vote).toHaveProperty('contributions');
    });

    it('calculates correct weighted percentages', () => {
      const vote = createStructuredVote({
        complexity: 4,
        confidence: 4,
        volume: 0,
        unknowns: 0,
      });

      expect(vote.percentageScore).toBe(35);
    });

    it('reduces contribution when confidence is high (4) compared to low (0)', () => {
      const highConfidenceVote = createStructuredVote({
        complexity: 0,
        confidence: 4,
        volume: 0,
        unknowns: 0,
      });

      const lowConfidenceVote = createStructuredVote({
        complexity: 0,
        confidence: 0,
        volume: 0,
        unknowns: 0,
      });

      expect(highConfidenceVote.percentageScore).toBe(0);
      expect(lowConfidenceVote.percentageScore).toBe(25);
      expect(highConfidenceVote.contributions?.find((c) => c.id === 'confidence')?.contributionPercent).toBe(0);
      expect(lowConfidenceVote.contributions?.find((c) => c.id === 'confidence')?.contributionPercent).toBe(25);
    });

    it('includes contribution breakdown for each criterion', () => {
      const vote = createStructuredVote({
        complexity: 2,
        confidence: 2,
        volume: 2,
        unknowns: 1,
      });

      expect(vote.contributions).toHaveLength(4);
      // @ts-ignore
      expect(vote.contributions[0]).toMatchObject({
        id: 'complexity',
        weightPercent: 35,
        score: 2,
        maxScore: 4,
      });
      // @ts-ignore
      expect(vote.contributions[1]).toMatchObject({
        id: 'confidence',
        weightPercent: 25,
        score: 2,
        maxScore: 4,
      });
    });

    it('tracks applied conversion rules', () => {
      const vote = createStructuredVote({
        complexity: 0,
        confidence: 0,
        volume: 4,
        unknowns: 1,
      });

      expect(vote.appliedConversionRules).toContain('Volume=4 → minimum 8pt');
      expect(vote.appliedConversionRules).toContain('Unknowns=1 → minimum 3pt');
    });

    it('has empty conversion rules when none apply', () => {
      const vote = createStructuredVote({
        complexity: 2,
        confidence: 2,
        volume: 2,
        unknowns: 0,
      });

      expect(vote.appliedConversionRules).toHaveLength(0);
    });
  });

  describe('getDefaultVotingCriteria', () => {
    it('returns 4 criteria', () => {
      const criteria = getDefaultVotingCriteria();
      expect(criteria).toHaveLength(4);
    });

    it('includes complexity criterion', () => {
      const criteria = getDefaultVotingCriteria();
      const complexity = criteria.find((c) => c.id === 'complexity');

      expect(complexity).toBeDefined();
      expect(complexity?.name).toBe('Complexity');
      expect(complexity?.minScore).toBe(0);
      expect(complexity?.maxScore).toBe(4);
    });

    it('includes confidence criterion', () => {
      const criteria = getDefaultVotingCriteria();
      const confidence = criteria.find((c) => c.id === 'confidence');

      expect(confidence).toBeDefined();
      expect(confidence?.name).toBe('Individual Confidence');
      expect(confidence?.maxScore).toBe(4);
    });

    it('includes volume criterion', () => {
      const criteria = getDefaultVotingCriteria();
      const volume = criteria.find((c) => c.id === 'volume');

      expect(volume).toBeDefined();
      expect(volume?.name).toBe('Volume');
      expect(volume?.maxScore).toBe(4);
    });

    it('includes unknowns criterion with max score of 2', () => {
      const criteria = getDefaultVotingCriteria();
      const unknowns = criteria.find((c) => c.id === 'unknowns');

      expect(unknowns).toBeDefined();
      expect(unknowns?.name).toBe('Unknowns');
      expect(unknowns?.maxScore).toBe(2);
    });
  });

  describe('isStructuredVote', () => {
    it('returns true for valid structured vote', () => {
      const vote = {
        criteriaScores: { complexity: 1 },
        calculatedStoryPoints: 1,
        percentageScore: 10,
        appliedConversionRules: [],
        contributions: [],
      };

      expect(isStructuredVote(vote)).toBe(true);
    });

    it('returns false for regular vote', () => {
      expect(isStructuredVote(5)).toBe(false);
      expect(isStructuredVote('5')).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(isStructuredVote(null)).toBe(false);
      expect(isStructuredVote(undefined)).toBe(false);
    });

    it('returns false for object without criteriaScores', () => {
      expect(isStructuredVote({ someOtherProp: 1 })).toBe(false);
    });
  });

  describe('real-world scenarios from documentation', () => {
    it('scenario: simple same-app fix', () => {
      const vote = createStructuredVote({
        complexity: 1,
        confidence: 4,
        volume: 0,
        unknowns: 0,
      });

      expect(vote.percentageScore).toBeCloseTo(8.75, 1);
      expect(vote.calculatedStoryPoints).toBe(1);
    });

    it('scenario: small familiar feature', () => {
      const vote = createStructuredVote({
        complexity: 1,
        confidence: 3,
        volume: 1,
        unknowns: 0,
      });

      expect(vote.calculatedStoryPoints).toBe(1);
    });

    it('scenario: moderate task with some unknowns', () => {
      const vote = createStructuredVote({
        complexity: 1,
        confidence: 3,
        volume: 1,
        unknowns: 1,
      });

      expect(vote.calculatedStoryPoints).toBe(3);
      expect(vote.appliedConversionRules).toContain('Unknowns=1 → minimum 3pt');
    });

    it('scenario: complex cross-repo work', () => {
      const vote = createStructuredVote({
        complexity: 3,
        confidence: 2,
        volume: 2,
        unknowns: 0,
      });

      expect(vote.calculatedStoryPoints).toBe(5);
    });

    it('scenario: maximum complexity', () => {
      const vote = createStructuredVote({
        complexity: 4,
        confidence: 0,
        volume: 4,
        unknowns: 2,
      });

      expect(vote.percentageScore).toBe(100);
      expect(vote.calculatedStoryPoints).toBe(8);
    });
  });
});
