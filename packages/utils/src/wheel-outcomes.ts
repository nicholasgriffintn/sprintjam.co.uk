import type {
  SpinResult,
  WorkspaceWheelAutomationSuggestion,
  WorkspaceWheelMode,
  WorkspaceWheelOutcome,
} from "@sprintjam/types";

const MAX_WORKSPACE_WHEEL_OUTCOMES = 20;

const WORKSPACE_WHEEL_MODE_LABELS: Record<
  WorkspaceWheelMode,
  { resultLabel: string }
> = {
  decision: { resultLabel: "Decision" },
  reviewer: { resultLabel: "Reviewer" },
  speaker_order: { resultLabel: "Speaker" },
};

export function isWorkspaceWheelMode(
  mode: unknown,
): mode is WorkspaceWheelMode {
  return mode === "decision" || mode === "reviewer" || mode === "speaker_order";
}

export function getWorkspaceWheelModeResultLabel(
  mode: WorkspaceWheelMode,
): string {
  return WORKSPACE_WHEEL_MODE_LABELS[mode].resultLabel;
}

export function buildWheelOutcomeAutomationSuggestions(
  mode: WorkspaceWheelMode,
  winner: string,
): WorkspaceWheelAutomationSuggestion[] {
  if (mode === "decision") {
    return [
      {
        label: "Post decision",
        detail: `Share "${winner}" to the connected Slack or Teams channel.`,
        provider: "slack",
      },
      {
        label: "Update linked issue",
        detail: "Record the decision against an imported Jira, Linear, or GitHub item.",
        provider: "github",
      },
    ];
  }

  if (mode === "reviewer") {
    return [
      {
        label: "Assign reviewer",
        detail: `Assign ${winner} on the linked Jira, Linear, or GitHub item.`,
        provider: "github",
      },
      {
        label: "Notify reviewer",
        detail: `Send ${winner} the review context in Slack or Teams.`,
        provider: "teams",
      },
    ];
  }

  return [
    {
      label: "Queue speaker",
      detail: `Add ${winner} to the facilitation order for this planning or standup context.`,
    },
    {
      label: "Share next speaker",
      detail: "Post the next speaker to the connected Slack or Teams channel.",
      provider: "slack",
    },
  ];
}

export function buildWorkspaceWheelOutcome(
  result: SpinResult,
  mode: WorkspaceWheelMode,
  recordedAt = Date.now(),
): WorkspaceWheelOutcome {
  return {
    id: result.id,
    mode,
    resultLabel: getWorkspaceWheelModeResultLabel(mode),
    winner: result.winner,
    timestamp: result.timestamp,
    removedAfter: result.removedAfter,
    recordedAt,
    automation: buildWheelOutcomeAutomationSuggestions(mode, result.winner),
  };
}

export function appendWorkspaceWheelOutcome(
  metadata: Record<string, unknown> | null,
  outcome: WorkspaceWheelOutcome,
): Record<string, unknown> {
  const nextMetadata: Record<string, unknown> = {
    ...(metadata ?? {}),
    type: "wheel",
  };
  const existingOutcomes = Array.isArray(nextMetadata.wheelOutcomes)
    ? nextMetadata.wheelOutcomes.filter(
        (item): item is WorkspaceWheelOutcome =>
          typeof item === "object" && item !== null && "id" in item,
      )
    : [];

  const withoutDuplicate = existingOutcomes.filter(
    (item) => item.id !== outcome.id,
  );
  nextMetadata.wheelOutcomes = [...withoutDuplicate, outcome].slice(
    -MAX_WORKSPACE_WHEEL_OUTCOMES,
  );

  return nextMetadata;
}
