import { VoteValue } from '@sprintjam/types';

export function serializeJSON(value: unknown): string | null {
  return value === undefined || value === null ? null : JSON.stringify(value);
}

export function serializeVote(value: VoteValue | null): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  return typeof value === 'number' ? value.toString() : value || 'null';
}
