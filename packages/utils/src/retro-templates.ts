import type { RetroSettings, RetroTemplate } from "@sprintjam/types";
import { DEFAULT_RETRO_SETTINGS } from "@sprintjam/types";

export const RETRO_TEMPLATES = [
  {
    id: "start-stop-continue",
    name: "Start, Stop, Continue",
    summary: "A balanced format for finding habits to add, remove, and keep.",
    description:
      "Use this when the team needs a simple structure that turns feedback into concrete operating changes.",
    tags: ["popular", "balanced", "quick"],
    columns: [
      {
        id: "start",
        title: "Start",
        prompt: "What should we start doing?",
        tone: "emerald",
      },
      {
        id: "stop",
        title: "Stop",
        prompt: "What should we stop doing?",
        tone: "rose",
      },
      {
        id: "continue",
        title: "Continue",
        prompt: "What should we keep doing?",
        tone: "sky",
      },
    ],
  },
  {
    id: "four-ls",
    name: "4Ls",
    summary: "Explore what the team liked, learned, lacked, and longed for.",
    description:
      "Use this after a delivery cycle when you want emotional signal and practical learning in the same room.",
    tags: ["learning", "team-health"],
    columns: [
      {
        id: "liked",
        title: "Liked",
        prompt: "What did we like?",
        tone: "emerald",
      },
      {
        id: "learned",
        title: "Learned",
        prompt: "What did we learn?",
        tone: "sky",
      },
      {
        id: "lacked",
        title: "Lacked",
        prompt: "What was missing?",
        tone: "amber",
      },
      {
        id: "longed-for",
        title: "Longed for",
        prompt: "What did we wish for?",
        tone: "violet",
      },
    ],
  },
  {
    id: "mad-sad-glad",
    name: "Mad, Sad, Glad",
    summary: "Surface emotional friction before jumping to solutions.",
    description:
      "Use this when morale, frustration, or team energy needs explicit space.",
    tags: ["team-health", "emotion"],
    columns: [
      { id: "mad", title: "Mad", prompt: "What frustrated us?", tone: "rose" },
      { id: "sad", title: "Sad", prompt: "What disappointed us?", tone: "sky" },
      {
        id: "glad",
        title: "Glad",
        prompt: "What made us happy?",
        tone: "emerald",
      },
    ],
  },
  {
    id: "kalm",
    name: "KALM",
    summary: "Keep, Add, Less, More for practical working agreements.",
    description:
      "Use this when you want a sharper operating model for the next iteration.",
    tags: ["process", "actions"],
    columns: [
      {
        id: "keep",
        title: "Keep",
        prompt: "What should stay?",
        tone: "emerald",
      },
      { id: "add", title: "Add", prompt: "What should we add?", tone: "sky" },
      {
        id: "less",
        title: "Less",
        prompt: "What needs less attention?",
        tone: "amber",
      },
      {
        id: "more",
        title: "More",
        prompt: "What needs more attention?",
        tone: "violet",
      },
    ],
  },
  {
    id: "sailboat",
    name: "Sailboat",
    summary: "Map goals, tailwinds, anchors, and risks.",
    description:
      "Use this for delivery retros where the team needs to understand what moved work forward or held it back.",
    tags: ["delivery", "risk"],
    columns: [
      {
        id: "island",
        title: "Goal",
        prompt: "Where are we trying to get to?",
        tone: "emerald",
      },
      {
        id: "wind",
        title: "Wind",
        prompt: "What helped us move?",
        tone: "sky",
      },
      {
        id: "anchor",
        title: "Anchor",
        prompt: "What slowed us down?",
        tone: "rose",
      },
      {
        id: "rocks",
        title: "Risks",
        prompt: "What risks are ahead?",
        tone: "amber",
      },
    ],
  },
  {
    id: "rose-thorn-bud",
    name: "Rose, Thorn, Bud",
    summary: "Review positives, pain points, and emerging opportunities.",
    description:
      "Use this when a team needs an optimistic but honest conversation about recent work.",
    tags: ["balanced", "opportunities"],
    columns: [
      { id: "rose", title: "Rose", prompt: "What went well?", tone: "emerald" },
      { id: "thorn", title: "Thorn", prompt: "What hurt?", tone: "rose" },
      {
        id: "bud",
        title: "Bud",
        prompt: "What opportunity is emerging?",
        tone: "violet",
      },
    ],
  },
] as const satisfies RetroTemplate[];

export function getRetroTemplate(templateId?: string | null): RetroTemplate {
  return (
    RETRO_TEMPLATES.find((template) => template.id === templateId) ??
    RETRO_TEMPLATES[0]
  );
}

export function isRetroTemplateId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    RETRO_TEMPLATES.some((template) => template.id === value)
  );
}

export function normaliseRetroSettings(
  base?: Partial<RetroSettings> | null,
  override?: Partial<RetroSettings> | null,
): RetroSettings {
  const merged = {
    ...DEFAULT_RETRO_SETTINGS,
    ...(base ?? {}),
    ...(override ?? {}),
  };

  const votesPerParticipant = Number.isInteger(merged.votesPerParticipant)
    ? Math.min(Math.max(merged.votesPerParticipant, 1), 10)
    : DEFAULT_RETRO_SETTINGS.votesPerParticipant;
  const timerMinutes = Number.isInteger(merged.timerMinutes)
    ? Math.min(Math.max(merged.timerMinutes, 1), 60)
    : DEFAULT_RETRO_SETTINGS.timerMinutes;

  return {
    templateId: isRetroTemplateId(merged.templateId)
      ? merged.templateId
      : DEFAULT_RETRO_SETTINGS.templateId,
    anonymousCards: Boolean(merged.anonymousCards),
    votesPerParticipant,
    timerMinutes,
    allowParticipantPhaseControl: Boolean(merged.allowParticipantPhaseControl),
  };
}
