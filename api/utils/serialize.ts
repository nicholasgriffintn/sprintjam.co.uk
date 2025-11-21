import { VoteValue } from '../types';

export function serializeJSON(value: unknown): string | null {
  return value === undefined || value === null ? null : JSON.stringify(value);
}

export function serializeVote(value: VoteValue): string {
  return typeof value === 'number' ? value.toString() : value || 'null';
}
