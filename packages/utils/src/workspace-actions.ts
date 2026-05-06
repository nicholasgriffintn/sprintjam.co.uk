import {
  buildPlanningFollowUpActionId,
  buildWheelOutcomeActionId,
} from "./recap-actions";
import { normaliseOptionalString } from "./string";
import { isRecord } from "./object";
import type {
  LinkedTicket,
  SpinResult,
  WorkspaceActionPriority,
  WorkspaceActionSource,
  WorkspaceActionStatus,
  WorkspaceProcessLoopStatus,
  WorkspaceWheelMode,
} from "@sprintjam/types";

export const WORKSPACE_ACTION_STATUSES: WorkspaceActionStatus[] = [
  "open",
  "in_progress",
  "resolved",
  "dismissed",
];

export const WORKSPACE_ACTION_SOURCES: WorkspaceActionSource[] = [
  "planning",
  "standup",
  "wheel",
  "manual",
];

export const WORKSPACE_ACTION_PRIORITIES: WorkspaceActionPriority[] = [
  "low",
  "normal",
  "high",
];

export const WORKSPACE_PROCESS_LOOP_STATUSES: WorkspaceProcessLoopStatus[] = [
  "planned",
  "active",
  "completed",
];

export interface WorkspaceProcessLoopIntent {
  key: string;
  name: string;
  goal?: string | null;
  status?: WorkspaceProcessLoopStatus;
  startsAt?: number | null;
  endsAt?: number | null;
}

export interface WorkspaceActionIntent {
  source: WorkspaceActionSource;
  sourceRef: string;
  title: string;
  detail?: string | null;
  priority?: WorkspaceActionPriority;
  ownerName?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface PlanningFollowUpQueueItem {
  ticketId: string;
  title?: string | null;
  description?: string | null;
  outcome?: string | null;
}

export function isWorkspaceActionStatus(
  value: unknown,
): value is WorkspaceActionStatus {
  return WORKSPACE_ACTION_STATUSES.some((status) => status === value);
}

export function isWorkspaceActionSource(
  value: unknown,
): value is WorkspaceActionSource {
  return WORKSPACE_ACTION_SOURCES.some((source) => source === value);
}

export function isWorkspaceActionPriority(
  value: unknown,
): value is WorkspaceActionPriority {
  return WORKSPACE_ACTION_PRIORITIES.some((priority) => priority === value);
}

export function isWorkspaceProcessLoopStatus(
  value: unknown,
): value is WorkspaceProcessLoopStatus {
  return WORKSPACE_PROCESS_LOOP_STATUSES.some((status) => status === value);
}

export function buildWorkspaceProcessLoopKey(teamId: number, date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `team-${teamId}-${year}-${month}-${day}`;
}

export function buildWorkspaceProcessLoopIntent(
  teamId: number,
  date = new Date(),
): WorkspaceProcessLoopIntent {
  const key = buildWorkspaceProcessLoopKey(teamId, date);
  const label = key.replace(`team-${teamId}-`, "");

  return {
    key,
    name: `Team loop ${label}`,
    status: "active",
    startsAt: new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    ).getTime(),
  };
}

export function parseWorkspaceProcessLoopIntent(
  value: unknown,
): WorkspaceProcessLoopIntent | null {
  if (!isRecord(value)) {
    return null;
  }

  const key = normaliseOptionalString(value.key);
  const name = normaliseOptionalString(value.name);
  if (!key || !name) {
    return null;
  }

  const status = isWorkspaceProcessLoopStatus(value.status)
    ? value.status
    : "active";

  return {
    key,
    name,
    status,
    goal: normaliseOptionalString(value.goal),
    startsAt: typeof value.startsAt === "number" ? value.startsAt : null,
    endsAt: typeof value.endsAt === "number" ? value.endsAt : null,
  };
}

export function buildPlanningActionIntents(
  sessionId: number,
  followUps: unknown,
): WorkspaceActionIntent[] {
  if (!Array.isArray(followUps)) {
    return [];
  }

  return followUps.flatMap((followUp): WorkspaceActionIntent[] => {
    const sourceRef = buildPlanningFollowUpActionId(sessionId, followUp);
    if (!sourceRef) {
      return [];
    }

    if (typeof followUp === "string") {
      const title = normaliseOptionalString(followUp);
      return title
        ? [{ source: "planning", sourceRef, title, priority: "normal" }]
        : [];
    }

    if (!isRecord(followUp)) {
      return [];
    }

    const title = normaliseOptionalString(followUp.title);
    if (!title) {
      return [];
    }

    return [
      {
        source: "planning",
        sourceRef,
        title,
        detail: normaliseOptionalString(followUp.detail),
        priority: "normal",
        metadata: normaliseOptionalString(followUp.ticketKey)
          ? { ticketKey: normaliseOptionalString(followUp.ticketKey) }
          : null,
      },
    ];
  });
}

export function buildPlanningFollowUpsFromTicketQueue(
  ticketQueue: PlanningFollowUpQueueItem[] | undefined,
): Array<{ title: string; detail?: string | null; ticketKey?: string | null }> {
  return (ticketQueue ?? []).flatMap((ticket) => {
    if (!ticket.ticketId.startsWith("FOLLOW-")) {
      return [];
    }

    const title = normaliseOptionalString(ticket.title);
    if (!title) {
      return [];
    }

    return [
      {
        title,
        detail: normaliseOptionalString(ticket.outcome ?? ticket.description),
        ticketKey: normaliseOptionalString(ticket.ticketId),
      },
    ];
  });
}

export function buildWheelActionIntent(
  sessionId: number,
  mode: WorkspaceWheelMode,
  result: SpinResult,
  resultLabel: string,
  automationLabel?: string,
): WorkspaceActionIntent | null {
  const sourceRef = buildWheelOutcomeActionId(sessionId, result.id);
  if (!sourceRef) {
    return null;
  }

  return {
    source: "wheel",
    sourceRef,
    title: `${resultLabel}: ${result.winner}`,
    detail: automationLabel ?? null,
    priority: mode === "decision" ? "high" : "normal",
    metadata: {
      mode,
      resultId: result.id,
      removedAfter: result.removedAfter,
      timestamp: result.timestamp,
    },
  };
}

export function buildStandupBlockerActionIntents(
  blockers: Array<{
    userName: string;
    description?: string | null;
    linkedTickets?: LinkedTicket[];
  }>,
): WorkspaceActionIntent[] {
  return blockers.flatMap((blocker): WorkspaceActionIntent[] => {
    const userName = normaliseOptionalString(blocker.userName);
    if (!userName) {
      return [];
    }

    const ticketKeys =
      blocker.linkedTickets?.map((ticket) => ticket.key).filter(Boolean) ?? [];
    const detailParts = [
      normaliseOptionalString(blocker.description),
      ticketKeys.length ? `Tickets: ${ticketKeys.join(", ")}` : null,
    ].filter((part): part is string => Boolean(part));

    return [
      {
        source: "standup",
        sourceRef: `standup-blocker:${userName.toLowerCase()}`,
        title: `Resolve blocker for ${userName}`,
        detail: detailParts.join(" · ") || "Needs follow-up",
        priority: "high",
        ownerName: userName,
        metadata: ticketKeys.length ? { ticketKeys } : null,
      },
    ];
  });
}

export function buildStandupNextStepActionIntents(
  nextSteps: Array<{
    userName: string;
    description?: string | null;
    linkedTickets?: LinkedTicket[];
  }>,
): WorkspaceActionIntent[] {
  return nextSteps.flatMap((nextStep): WorkspaceActionIntent[] => {
    const userName = normaliseOptionalString(nextStep.userName);
    const description = normaliseOptionalString(nextStep.description);
    if (!userName || !description) {
      return [];
    }

    const ticketKeys =
      nextStep.linkedTickets?.map((ticket) => ticket.key).filter(Boolean) ??
      [];
    const detailParts = [
      description,
      ticketKeys.length ? `Tickets: ${ticketKeys.join(", ")}` : null,
    ].filter((part): part is string => Boolean(part));

    return [
      {
        source: "standup",
        sourceRef: `standup-next-step:${userName.toLowerCase()}`,
        title: `Next step for ${userName}`,
        detail: detailParts.join(" · "),
        priority: "normal",
        ownerName: userName,
        metadata: ticketKeys.length ? { ticketKeys } : null,
      },
    ];
  });
}
