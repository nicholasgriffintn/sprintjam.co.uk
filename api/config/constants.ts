import {
  DEFAULT_EXTRA_VOTE_OPTIONS,
  DEFAULT_VOTING_SEQUENCE_ID,
  VOTING_SEQUENCE_TEMPLATES,
} from "./voting";

const defaultSequence =
  VOTING_SEQUENCE_TEMPLATES.find(
    (preset) => preset.id === DEFAULT_VOTING_SEQUENCE_ID,
  ) ?? VOTING_SEQUENCE_TEMPLATES[0];
const defaultExtras = DEFAULT_EXTRA_VOTE_OPTIONS.filter(
  (option) => option.enabled !== false,
);

export const VOTING_OPTIONS: ReadonlyArray<string | number> = Object.freeze([
  ...(defaultSequence?.options ?? []),
  ...defaultExtras.map((option) => option.value),
]);

export const STRUCTURED_VOTING_OPTIONS: ReadonlyArray<number> = Object.freeze([
  1, 3, 5, 8,
]);

export const SPECIAL_COLORS: Record<string, string> = Object.freeze({
  "?": "#f2f2ff",
  "❓": "#f2f2ff",
  coffee: "#f5e6d8",
  "☕": "#f5e6d8",
  break: "#f8e8c8",
  "♾️": "#ffe4e6",
});

export const DEFAULT_TIMER_DURATION_SECONDS = 3 * 60;
export const MIN_TIMER_DURATION_SECONDS = 60;
export const MAX_TIMER_DURATION_SECONDS = 60 * 60;

export const ROOM_ROW_ID = 1;
