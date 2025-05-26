export function findClosestOption(value: number, validOptions: number[]): number {
  if (validOptions.length === 0) return Math.round(value);

  return validOptions.reduce((closest, option) => {
    return Math.abs(value - option) < Math.abs(value - closest) ? option : closest;
  });
}