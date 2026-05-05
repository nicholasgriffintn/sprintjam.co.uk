import type { WheelMode } from "@sprintjam/types";

export const WHEEL_MODE_OPTIONS: Array<{
  value: WheelMode;
  label: string;
  description: string;
  resultLabel: string;
}> = [
  {
    value: "decision",
    label: "Decision",
    description: "Pick from options when the team needs a fast choice.",
    resultLabel: "Choice",
  },
  {
    value: "speaker_order",
    label: "Speaker order",
    description: "Choose who speaks next during planning or standup.",
    resultLabel: "Speaker",
  },
  {
    value: "reviewer",
    label: "Reviewer",
    description: "Pick someone to review, pair, or sanity-check work.",
    resultLabel: "Reviewer",
  },
  {
    value: "break_picker",
    label: "Break picker",
    description: "Choose a short reset activity or break option.",
    resultLabel: "Break",
  },
  {
    value: "pair_picker",
    label: "Pair picker",
    description: "Pick the first person for a pairing round.",
    resultLabel: "Pick",
  },
];

const DEFAULT_WHEEL_MODE_OPTION = WHEEL_MODE_OPTIONS[0];

export function getWheelModeOption(mode?: WheelMode) {
  return (
    WHEEL_MODE_OPTIONS.find((option) => option.value === mode) ??
    DEFAULT_WHEEL_MODE_OPTION
  );
}
