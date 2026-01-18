export interface PaginationOptions {
  limit: number;
  offset: number;
}

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;
export const MIN_PAGE_SIZE = 1;

export function parsePagination(
  url: URL,
  options?: { defaultLimit?: number },
): PaginationOptions {
  const defaultLimit = options?.defaultLimit ?? DEFAULT_PAGE_SIZE;

  const rawLimit = url.searchParams.get('limit');
  const rawOffset = url.searchParams.get('offset');

  const limit = rawLimit ? Number.parseInt(rawLimit, 10) : defaultLimit;
  const offset = rawOffset ? Number.parseInt(rawOffset, 10) : 0;

  if (Number.isNaN(limit) || limit < MIN_PAGE_SIZE || limit > MAX_PAGE_SIZE) {
    throw new Error(
      `limit must be between ${MIN_PAGE_SIZE} and ${MAX_PAGE_SIZE}`,
    );
  }

  if (Number.isNaN(offset) || offset < 0) {
    throw new Error('offset must be a non-negative number');
  }

  return { limit, offset };
}
