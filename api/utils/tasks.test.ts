import { describe, expect, it } from 'vitest';
import { getTaskSize } from './tasks';

describe('tasks utils', () => {
  it('returns null for non-numeric strings', () => {
    expect(getTaskSize('abc')).toBeNull();
  });

  it('maps numeric values to size buckets', () => {
    expect(getTaskSize(0)).toBe('xs');
    expect(getTaskSize(1)).toBe('xs');
    expect(getTaskSize(2)).toBe('sm');
    expect(getTaskSize(4)).toBe('md');
    expect(getTaskSize(8)).toBe('lg');
    expect(getTaskSize(13)).toBe('xl');
  });
});
