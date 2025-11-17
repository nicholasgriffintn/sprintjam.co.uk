import { describe, it, expect } from 'vitest';
import { PlanningPokerJudge } from './planning-poker-judge';
import { JudgeAlgorithm } from '../types';

describe('PlanningPokerJudge', () => {
  const judge = new PlanningPokerJudge();
  const fibonacciOptions = [1, 2, 3, 5, 8, 13, 21];

  describe('calculateJudgeScore - edge cases', () => {
    it('handles empty votes', () => {
      const result = judge.calculateJudgeScore(
        [],
        JudgeAlgorithm.SMART_CONSENSUS,
        fibonacciOptions
      );
      expect(result.score).toBe(null);
      expect(result.confidence).toBe('low');
      expect(result.reasoning).toBe('No votes to analyze');
    });

    it('handles single vote', () => {
      const result = judge.calculateJudgeScore(
        [5],
        JudgeAlgorithm.SMART_CONSENSUS,
        fibonacciOptions
      );
      expect(result.score).toBe(5);
      expect(result.confidence).toBe('low');
      expect(result.reasoning).toBe('No consensus possible');
    });
  });

  describe('smartConsensus algorithm', () => {
    it('detects strong consensus when >60% vote the same', () => {
      const votes = [5, 5, 5, 5, 8]; // 80% voted for 5
      const result = judge.calculateJudgeScore(
        votes,
        JudgeAlgorithm.SMART_CONSENSUS,
        fibonacciOptions
      );

      expect(result.score).toBe(5);
      expect(result.confidence).toBe('high');
      expect(result.needsDiscussion).toBe(false);
      expect(result.reasoning).toContain('Strong consensus');
    });

    it('handles adjacent consensus', () => {
      const votes = [3, 5, 5, 5, 8]; // Clustered around 5
      const result = judge.calculateJudgeScore(
        votes,
        JudgeAlgorithm.SMART_CONSENSUS,
        fibonacciOptions
      );

      expect(result.score).toBeGreaterThanOrEqual(3);
      expect(result.score).toBeLessThanOrEqual(8);
    });

    it('flags wide spread for discussion', () => {
      const votes = [1, 8, 13, 21]; // Very wide spread
      const result = judge.calculateJudgeScore(
        votes,
        JudgeAlgorithm.SMART_CONSENSUS,
        fibonacciOptions
      );

      expect(result.needsDiscussion).toBe(true);
      expect(result.confidence).toBe('low');
      expect(result.reasoning).toContain('Wide spread');
    });

    it('uses median for moderate spread', () => {
      const votes = [3, 5, 5, 8];
      const result = judge.calculateJudgeScore(
        votes,
        JudgeAlgorithm.SMART_CONSENSUS,
        fibonacciOptions
      );

      expect(result.score).toBe(5); // Median of [3, 5, 5, 8] is 5
    });
  });

  describe('conservativeMode algorithm', () => {
    it('uses 75th percentile for conservative estimate', () => {
      const votes = [1, 3, 5, 8]; // 75th percentile ≈ 8
      const result = judge.calculateJudgeScore(
        votes,
        JudgeAlgorithm.CONSERVATIVE_MODE,
        fibonacciOptions
      );

      expect(result.score).toBeGreaterThanOrEqual(5);
      expect(result.reasoning).toContain('Conservative');
      expect(result.reasoning).toContain('75th percentile');
    });

    it('has high confidence with tight clustering', () => {
      const votes = [5, 5, 5, 5]; // All the same for high confidence
      const result = judge.calculateJudgeScore(
        votes,
        JudgeAlgorithm.CONSERVATIVE_MODE,
        fibonacciOptions
      );

      expect(result.confidence).toBe('high');
      expect(result.needsDiscussion).toBe(false);
    });

    it('flags need for discussion with high variance', () => {
      const votes = [1, 5, 13, 21];
      const result = judge.calculateJudgeScore(
        votes,
        JudgeAlgorithm.CONSERVATIVE_MODE,
        fibonacciOptions
      );

      expect(result.confidence).toBe('low');
      expect(result.needsDiscussion).toBe(true);
    });
  });

  describe('optimisticMode algorithm', () => {
    it('uses 25th percentile for optimistic estimate', () => {
      const votes = [1, 3, 5, 8]; // 25th percentile ≈ 1-3
      const result = judge.calculateJudgeScore(
        votes,
        JudgeAlgorithm.OPTIMISTIC_MODE,
        fibonacciOptions
      );

      expect(result.score).toBeLessThanOrEqual(5);
      expect(result.reasoning).toContain('Optimistic');
      expect(result.reasoning).toContain('25th percentile');
    });

    it('has high confidence with tight clustering', () => {
      const votes = [5, 5, 5, 5]; // All the same for high confidence
      const result = judge.calculateJudgeScore(
        votes,
        JudgeAlgorithm.OPTIMISTIC_MODE,
        fibonacciOptions
      );

      expect(result.confidence).toBe('high');
      expect(result.needsDiscussion).toBe(false);
    });
  });

  describe('simpleAverage algorithm', () => {
    it('calculates simple average of votes', () => {
      const votes = [2, 4, 6, 8]; // Average = 5
      const result = judge.calculateJudgeScore(
        votes,
        JudgeAlgorithm.SIMPLE_AVERAGE,
        fibonacciOptions
      );

      expect(result.score).toBe(5);
      expect(result.reasoning).toContain('Simple average');
    });

    it('rounds to closest valid option', () => {
      const votes = [3, 5]; // Average = 4, closest option is 3 or 5
      const result = judge.calculateJudgeScore(
        votes,
        JudgeAlgorithm.SIMPLE_AVERAGE,
        fibonacciOptions
      );

      expect(fibonacciOptions).toContain(result.score!);
    });

    it('has high confidence with low variance', () => {
      const votes = [5, 5, 5, 5];
      const result = judge.calculateJudgeScore(
        votes,
        JudgeAlgorithm.SIMPLE_AVERAGE,
        fibonacciOptions
      );

      expect(result.confidence).toBe('high');
      expect(result.needsDiscussion).toBe(false);
    });
  });

  describe('valid options handling', () => {
    it('always returns a valid option from the provided list', () => {
      const votes = [4, 6, 7]; // None are valid options
      const result = judge.calculateJudgeScore(
        votes,
        JudgeAlgorithm.SMART_CONSENSUS,
        fibonacciOptions
      );

      expect(fibonacciOptions).toContain(result.score!);
    });

    it('works with custom options', () => {
      const customOptions = [1, 2, 4, 8, 16];
      const votes = [3, 5, 7]; // Should round to closest
      const result = judge.calculateJudgeScore(
        votes,
        JudgeAlgorithm.SMART_CONSENSUS,
        customOptions
      );

      expect(customOptions).toContain(result.score!);
    });
  });

  describe('real-world scenarios', () => {
    it('handles unanimous agreement', () => {
      const votes = [8, 8, 8, 8, 8];
      const result = judge.calculateJudgeScore(
        votes,
        JudgeAlgorithm.SMART_CONSENSUS,
        fibonacciOptions
      );

      expect(result.score).toBe(8);
      expect(result.confidence).toBe('high');
      expect(result.needsDiscussion).toBe(false);
    });

    it('handles complete disagreement', () => {
      const votes = [1, 5, 8, 13, 21];
      const result = judge.calculateJudgeScore(
        votes,
        JudgeAlgorithm.SMART_CONSENSUS,
        fibonacciOptions
      );

      expect(result.needsDiscussion).toBe(true);
      expect(result.confidence).toBe('low');
    });

    it('handles two-vote tie', () => {
      const votes = [5, 5, 8, 8];
      const result = judge.calculateJudgeScore(
        votes,
        JudgeAlgorithm.SMART_CONSENSUS,
        fibonacciOptions
      );

      expect([5, 8]).toContain(result.score);
    });
  });

  describe('question mark vote handling', () => {
    it('handles only question mark votes', () => {
      const result = judge.calculateJudgeScore(
        [],
        JudgeAlgorithm.SMART_CONSENSUS,
        fibonacciOptions,
        3,
        3
      );

      expect(result.score).toBe(null);
      expect(result.confidence).toBe('low');
      expect(result.needsDiscussion).toBe(true);
      expect(result.reasoning).toContain('3 "?" votes');
    });

    it('downgrades confidence when >20% are question marks', () => {
      const votes = [5, 5, 5, 5, 5];
      const result = judge.calculateJudgeScore(
        votes,
        JudgeAlgorithm.SMART_CONSENSUS,
        fibonacciOptions,
        7,
        2
      );

      expect(result.confidence).toBe('medium');
      expect(result.reasoning).toContain('2 "?" votes');
    });

    it('triggers discussion when >30% are question marks', () => {
      const votes = [5, 5, 5];
      const result = judge.calculateJudgeScore(
        votes,
        JudgeAlgorithm.SMART_CONSENSUS,
        fibonacciOptions,
        5,
        2
      );

      expect(result.needsDiscussion).toBe(true);
      expect(result.reasoning).toContain('2 "?" votes');
    });

    it('includes question mark count in conservative mode reasoning', () => {
      const votes = [3, 5, 8];
      const result = judge.calculateJudgeScore(
        votes,
        JudgeAlgorithm.CONSERVATIVE_MODE,
        fibonacciOptions,
        4,
        1
      );

      expect(result.reasoning).toContain('1 "?" vote');
      expect(result.needsDiscussion).toBe(true);
    });

    it('includes question mark count in optimistic mode reasoning', () => {
      const votes = [3, 5, 8];
      const result = judge.calculateJudgeScore(
        votes,
        JudgeAlgorithm.OPTIMISTIC_MODE,
        fibonacciOptions,
        5,
        2
      );

      expect(result.reasoning).toContain('2 "?" votes');
      expect(result.needsDiscussion).toBe(true);
    });

    it('includes question mark count in simple average reasoning', () => {
      const votes = [3, 5, 8];
      const result = judge.calculateJudgeScore(
        votes,
        JudgeAlgorithm.SIMPLE_AVERAGE,
        fibonacciOptions,
        4,
        1
      );

      expect(result.reasoning).toContain('1 "?" vote');
      expect(result.needsDiscussion).toBe(true);
    });

    it('handles single numeric vote with question marks', () => {
      const result = judge.calculateJudgeScore(
        [5],
        JudgeAlgorithm.SMART_CONSENSUS,
        fibonacciOptions,
        3,
        2
      );

      expect(result.score).toBe(5);
      expect(result.confidence).toBe('low');
      expect(result.needsDiscussion).toBe(true);
      expect(result.reasoning).toContain('2 "?" votes');
    });
  });
});
