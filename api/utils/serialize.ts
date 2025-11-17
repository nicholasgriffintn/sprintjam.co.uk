export function serializeJSON(value: unknown): string | null {
  return value === undefined || value === null ? null : JSON.stringify(value);
}

export function serializeVote(value: string | number): string {
  return typeof value === 'number' ? value.toString() : value;
}
