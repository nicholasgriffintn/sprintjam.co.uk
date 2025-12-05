import { describe, expect, it } from 'vitest';
import { generateColorFromString, generateColorFromValue } from './colors';

describe('colors utils', () => {
  describe('generateColorFromValue', () => {
    it('returns the neutral color for zero', () => {
      expect(generateColorFromValue(0, 10)).toBe('#f0f0f0');
    });

    it('interpolates values within the gradient', () => {
      expect(generateColorFromValue(5, 10)).toBe('hsl(118, 75%, 80%)');
    });

    it('clamps values at or above the maximum', () => {
      expect(generateColorFromValue(20, 10)).toBe('hsl(15, 85%, 85%)');
    });
  });

  describe('generateColorFromString', () => {
    it('is deterministic for the same input string', () => {
      const first = generateColorFromString('room-key');
      const second = generateColorFromString('room-key');
      expect(first).toBe(second);
    });

    it('produces an HSL color string', () => {
      const color = generateColorFromString('another-key');
      expect(color.startsWith('hsl(')).toBe(true);
      expect(color.endsWith('%)')).toBe(true);
    });
  });
});
