import { describe, it, expect } from 'vitest';
import { findClosestOption } from './judge';

describe('Judge Utilities', () => {
  describe('findClosestOption', () => {
    it('finds exact match', () => {
      const validOptions = [1, 2, 3, 5, 8, 13];
      const result = findClosestOption(5, validOptions);
      expect(result).toBe(5);
    });

    it('rounds to nearest option', () => {
      const validOptions = [1, 2, 3, 5, 8, 13];
      const result = findClosestOption(4, validOptions);
      expect([3, 5]).toContain(result);
    });

    it('rounds up when equidistant', () => {
      const validOptions = [1, 3, 5];
      const result = findClosestOption(4, validOptions);
      expect([3, 5]).toContain(result);
    });

    it('handles value below minimum option', () => {
      const validOptions = [5, 10, 15];
      const result = findClosestOption(2, validOptions);
      expect(result).toBe(5);
    });

    it('handles value above maximum option', () => {
      const validOptions = [1, 2, 3];
      const result = findClosestOption(100, validOptions);
      expect(result).toBe(3);
    });

    it('returns rounded value for empty options array', () => {
      const result = findClosestOption(4.7, []);
      expect(result).toBe(5);
    });

    it('works with single option', () => {
      const validOptions = [42];
      const result = findClosestOption(100, validOptions);
      expect(result).toBe(42);
    });

    it('works with fibonacci sequence', () => {
      const validOptions = [1, 2, 3, 5, 8, 13, 21];
      expect(findClosestOption(6, validOptions)).toBe(5);
      expect(findClosestOption(7, validOptions)).toBe(8);
      expect(findClosestOption(10, validOptions)).toBe(8);
      expect(findClosestOption(12, validOptions)).toBe(13);
    });

    it('works with T-shirt sizes as numbers', () => {
      const validOptions = [1, 2, 4, 8, 16];
      expect(findClosestOption(3, validOptions)).toBe(2);
      expect(findClosestOption(5, validOptions)).toBe(4);
      expect(findClosestOption(12, validOptions)).toBe(8);
    });

    it('handles decimal values', () => {
      const validOptions = [1, 3, 5, 8];
      expect(findClosestOption(4.2, validOptions)).toBe(5);
      expect(findClosestOption(4.8, validOptions)).toBe(5);
      expect(findClosestOption(2.1, validOptions)).toBe(3);
    });

    it('handles negative values', () => {
      const validOptions = [-5, -3, 0, 3, 5];
      expect(findClosestOption(-4, validOptions)).toBe(-5);
      expect(findClosestOption(-1, validOptions)).toBe(0);
    });

    it('handles unordered options', () => {
      const validOptions = [13, 3, 8, 1, 5, 2];
      const result = findClosestOption(4, validOptions);
      expect([3, 5]).toContain(result);
    });
  });
});
