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
  XS: "#e0f2fe",
  S: "#c7d2fe",
  M: "#a5b4fc",
  L: "#93c5fd",
  XL: "#7dd3fc",
  "🌑 Moon": "#e5e7eb",
  "🌍 Earth": "#c8e6c9",
  "🔴 Mars": "#fecdd3",
  "🟠 Jupiter": "#fcd34d",
  "🪐 Saturn": "#fde68a",
  "🔵 Uranus": "#bfdbfe",
  "🌊 Neptune": "#a5b4fc",
  "❄️ Pluto": "#e0f2fe",
});

export const DEFAULT_TIMER_DURATION_SECONDS = 3 * 60;
export const MIN_TIMER_DURATION_SECONDS = 60;
export const MAX_TIMER_DURATION_SECONDS = 60 * 60;

export const ROOM_ROW_ID = 1;

export const FEEDBACK_GITHUB_OWNER = "nicholasgriffintn";
export const FEEDBACK_GITHUB_REPO = "sprintjam.co.uk";
export const FEEDBACK_GITHUB_DEFAULT_LABELS = ["feedback", "from-app"];
