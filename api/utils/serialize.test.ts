import { describe, expect, it } from 'vitest';
import { serializeJSON, serializeVote } from './serialize';

describe('serialize utils', () => {
  describe('serializeJSON', () => {
    it('returns null for undefined or null values', () => {
      expect(serializeJSON(undefined)).toBeNull();
      expect(serializeJSON(null)).toBeNull();
    });

    it('stringifies objects and primitives', () => {
      expect(serializeJSON({ foo: 'bar' })).toBe('{"foo":"bar"}');
      expect(serializeJSON('value')).toBe('"value"');
      expect(serializeJSON(3)).toBe('3');
    });
  });

  describe('serializeVote', () => {
    it('stringifies numeric votes', () => {
      expect(serializeVote(5)).toBe('5');
    });

    it('returns string votes as-is when truthy', () => {
      expect(serializeVote('?')).toBe('?');
      expect(serializeVote('coffee')).toBe('coffee');
    });

    it('returns "null" for nullish or empty values', () => {
      expect(serializeVote(null)).toBe('null');
      expect(serializeVote('')).toBe('null');
    });
  });
});
