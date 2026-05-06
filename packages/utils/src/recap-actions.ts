import { isRecord } from "./object";
import { normaliseOptionalString } from "./string";

export type LinkedSessionRecapActionKind =
  | "planning_follow_up"
  | "wheel_outcome";

interface ResolveRecapActionOptions {
  metadata: Record<string, unknown> | null;
  kind: LinkedSessionRecapActionKind;
  sessionId: number;
  actionId: string;
  resolvedAt: number;
  resolvedById: number;
}

interface ResolveRecapActionResult {
  metadata: Record<string, unknown>;
  matched: boolean;
}

function normaliseActionPart(value: unknown): string {
  const text =
    typeof value === "number" && Number.isFinite(value)
      ? String(value)
      : normaliseOptionalString(value);
  if (!text) {
    return "item";
  }

  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

export function buildLinkedSessionRecapActionId(
  kind: LinkedSessionRecapActionKind,
  sessionId: number,
  parts: unknown[],
): string {
  return [kind, sessionId, ...parts].map(normaliseActionPart).join("-");
}

export function buildPlanningFollowUpActionId(
  sessionId: number,
  followUp: unknown,
): string | null {
  if (typeof followUp === "string") {
    const title = normaliseOptionalString(followUp);
    return title
      ? buildLinkedSessionRecapActionId("planning_follow_up", sessionId, [
          title,
        ])
      : null;
  }

  if (!isRecord(followUp)) {
    return null;
  }

  const explicitId = normaliseOptionalString(followUp.id);
  const title = normaliseOptionalString(followUp.title);
  if (!explicitId && !title) {
    return null;
  }

  return buildLinkedSessionRecapActionId("planning_follow_up", sessionId, [
    explicitId ?? title,
    normaliseOptionalString(followUp.ticketKey),
  ]);
}

export function buildWheelOutcomeActionId(
  sessionId: number,
  outcomeId: unknown,
): string | null {
  const id = normaliseOptionalString(outcomeId);
  return id
    ? buildLinkedSessionRecapActionId("wheel_outcome", sessionId, [id])
    : null;
}

export function buildCurrentWheelOutcomeActionId(
  sessionId: number,
  mode: unknown,
): string | null {
  const normalisedMode = normaliseOptionalString(mode);
  return normalisedMode
    ? buildLinkedSessionRecapActionId("wheel_outcome", sessionId, [
        normalisedMode,
      ])
    : null;
}

export function isResolvedRecapAction(value: unknown): boolean {
  return (
    isRecord(value) &&
    (value.status === "resolved" || typeof value.resolvedAt === "number")
  );
}

function resolvePlanningFollowUp(
  followUp: unknown,
  options: ResolveRecapActionOptions,
): unknown {
  const id = buildPlanningFollowUpActionId(options.sessionId, followUp);
  if (id !== options.actionId) {
    return followUp;
  }

  if (typeof followUp === "string") {
    return {
      title: followUp,
      status: "resolved",
      resolvedAt: options.resolvedAt,
      resolvedById: options.resolvedById,
    };
  }

  if (!isRecord(followUp)) {
    return followUp;
  }

  return {
    ...followUp,
    status: "resolved",
    resolvedAt: options.resolvedAt,
    resolvedById: options.resolvedById,
  };
}

function resolveWheelOutcome(
  outcome: unknown,
  options: ResolveRecapActionOptions,
): unknown {
  if (!isRecord(outcome)) {
    return outcome;
  }

  const id = buildWheelOutcomeActionId(options.sessionId, outcome.id);
  if (id !== options.actionId) {
    return outcome;
  }

  return {
    ...outcome,
    status: "resolved",
    resolvedAt: options.resolvedAt,
    resolvedById: options.resolvedById,
  };
}

export function resolveTeamSessionRecapAction(
  options: ResolveRecapActionOptions,
): ResolveRecapActionResult {
  const metadata = { ...(options.metadata ?? {}) };

  if (options.kind === "planning_follow_up") {
    const followUps = metadata.planningFollowUps;
    if (!Array.isArray(followUps)) {
      return { metadata, matched: false };
    }

    let matched = false;
    metadata.planningFollowUps = followUps.map((followUp) => {
      const nextFollowUp = resolvePlanningFollowUp(followUp, options);
      if (nextFollowUp !== followUp) {
        matched = true;
      }
      return nextFollowUp;
    });

    return { metadata, matched };
  }

  const outcomes = metadata.wheelOutcomes;
  if (!Array.isArray(outcomes)) {
    return { metadata, matched: false };
  }

  let matched = false;
  metadata.wheelOutcomes = outcomes.map((outcome) => {
    const nextOutcome = resolveWheelOutcome(outcome, options);
    if (nextOutcome !== outcome) {
      matched = true;
    }
    return nextOutcome;
  });

  return { metadata, matched };
}
