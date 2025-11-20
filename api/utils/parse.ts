export function parseVote(value: string | null | undefined): string | number {
  if (value === null || value === undefined) {
    return '';
  }

  const numeric = Number(value);
  return Number.isNaN(numeric) ? value : numeric;
}

export function parseJudgeScore(
  value: string | null | undefined
): string | number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return numeric;
  }

  return value;
}

export function safeJsonParse<T>(json: string): T | undefined {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return undefined;
  }
}
