export function findClosestOption(
  value: number,
  validOptions: number[],
): number {
  if (validOptions.length === 0) return Math.round(value);

  return validOptions.reduce((closest, option) => {
    return Math.abs(value - option) < Math.abs(value - closest)
      ? option
      : closest;
  });
}

export function chunkArray<T>(items: readonly T[], size: number): T[][] {
  if (!Number.isInteger(size) || size <= 0) {
    throw new RangeError("Chunk size must be a positive integer");
  }

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}
