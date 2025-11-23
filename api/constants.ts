export const VOTING_OPTIONS: ReadonlyArray<string | number> = Object.freeze([
  "1",
  "2",
  "3",
  "5",
  "8",
  "13",
  "21",
  "?",
]);

export const STRUCTURED_VOTING_OPTIONS: ReadonlyArray<number> = Object.freeze([
  1, 3, 5, 8,
]);

export const SPECIAL_COLORS: Record<string, string> = Object.freeze({
  "?": "#f2f2ff",
  coffee: "#f5e6d8",
  break: "#f8e8c8",
});

export const DEFAULT_TIMER_DURATION_SECONDS = 3 * 60;
export const MIN_TIMER_DURATION_SECONDS = 60;
export const MAX_TIMER_DURATION_SECONDS = 60 * 60;
