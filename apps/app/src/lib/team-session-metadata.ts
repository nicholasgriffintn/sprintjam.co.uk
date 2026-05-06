import {
  buildPlanningFollowUpActionId,
  buildWheelOutcomeActionId,
  isRecord,
  isResolvedRecapAction,
  isWorkspaceWheelMode,
  type LinkedSessionRecapActionKind,
  buildWorkspaceProcessLoopIntent,
  parseWorkspaceProcessLoopIntent,
  normaliseOptionalString,
  safeJsonParse,
} from "@sprintjam/utils";
import type {
  TeamSession,
  WorkspaceWheelAutomationSuggestion,
  WorkspaceWheelOutcome,
} from "@sprintjam/types";

export type TeamSessionType = "planning" | "standup" | "wheel";

export interface LinkedSessionContext {
  id: string;
  label: string;
}

export interface PlanningFollowUp {
  id: string;
  sessionId: number;
  title: string;
  detail?: string;
  ticketKey?: string;
  source: TeamSessionType;
  status?: "resolved";
  resolvedAt?: number;
  resolvedById?: number;
}

export interface LinkedSessionRecapAction {
  id: string;
  kind: LinkedSessionRecapActionKind;
  sessionId: number;
  teamId: number;
  title: string;
  detail?: string | null;
}

export interface LinkedSessionSummary {
  context: LinkedSessionContext;
  sessions: TeamSession[];
  sessionTypes: TeamSessionType[];
  planningFollowUps: PlanningFollowUp[];
  wheelOutcomes: WorkspaceWheelOutcome[];
  recapText: string;
}

function parseWheelAutomationProvider(
  value: unknown,
): WorkspaceWheelAutomationSuggestion["provider"] | undefined {
  const provider = normaliseOptionalString(value);

  if (
    provider === "github" ||
    provider === "jira" ||
    provider === "linear" ||
    provider === "slack" ||
    provider === "teams"
  ) {
    return provider;
  }

  return undefined;
}

interface BuildTeamSessionMetadataOptions {
  type: TeamSessionType;
  teamId?: number;
  date?: Date;
}

const SESSION_TYPES = new Set<TeamSessionType>([
  "planning",
  "standup",
  "wheel",
]);

const normaliseSessionType = (value: unknown): TeamSessionType => {
  if (typeof value === "string" && SESSION_TYPES.has(value as TeamSessionType)) {
    return value as TeamSessionType;
  }

  return "planning";
};

export function parsePlanningFollowUpText(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => normaliseOptionalString(line.replace(/^[-*]\s*/, "")))
    .filter((line): line is string => Boolean(line));
}

export function buildTeamSessionMetadata({
  type,
  teamId,
  date = new Date(),
}: BuildTeamSessionMetadataOptions): Record<string, unknown> {
  const metadata: Record<string, unknown> = { type };

  if (teamId !== undefined) {
    metadata.processLoop = buildWorkspaceProcessLoopIntent(teamId, date);
  }

  return metadata;
}

export function parseTeamSessionMetadata(
  session: Pick<TeamSession, "metadata">,
): Record<string, unknown> | null {
  if (!session.metadata) {
    return null;
  }

  const parsed = safeJsonParse<unknown>(session.metadata, { silent: true });
  return isRecord(parsed) ? parsed : null;
}

export function getTeamSessionType(
  session: Pick<TeamSession, "metadata">,
): TeamSessionType {
  const metadata = parseTeamSessionMetadata(session);
  return normaliseSessionType(metadata?.type);
}

export function getLinkedSessionContext(
  session: Pick<TeamSession, "metadata">,
): LinkedSessionContext | null {
  const metadata = parseTeamSessionMetadata(session);
  const processLoop = parseWorkspaceProcessLoopIntent(metadata?.processLoop);
  if (!processLoop) {
    return null;
  }

  return {
    id: processLoop.key,
    label: processLoop.name,
  };
}

export function getPlanningFollowUps(
  session: Pick<TeamSession, "id" | "metadata">,
): PlanningFollowUp[] {
  const metadata = parseTeamSessionMetadata(session);
  const rawFollowUps = metadata?.planningFollowUps;

  if (!Array.isArray(rawFollowUps)) {
    return [];
  }

  const source = getTeamSessionType(session);

  return rawFollowUps.flatMap((followUp): PlanningFollowUp[] => {
    if (isResolvedRecapAction(followUp)) {
      return [];
    }

    const id = buildPlanningFollowUpActionId(session.id, followUp);
    if (!id) {
      return [];
    }

    if (typeof followUp === "string") {
      const title = normaliseOptionalString(followUp);
      return title ? [{ id, sessionId: session.id, title, source }] : [];
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
        title,
        id,
        sessionId: session.id,
        detail: normaliseOptionalString(followUp.detail),
        ticketKey: normaliseOptionalString(followUp.ticketKey),
        source,
      },
    ];
  });
}

function parseWheelAutomationSuggestion(
  value: unknown,
): WorkspaceWheelAutomationSuggestion | null {
  if (!isRecord(value)) {
    return null;
  }

  const label = normaliseOptionalString(value.label);
  const detail = normaliseOptionalString(value.detail);
  if (!label || !detail) {
    return null;
  }

  return {
    label,
    detail,
    provider: parseWheelAutomationProvider(value.provider),
  };
}

export function getWheelOutcomes(
  session: Pick<TeamSession, "id" | "metadata">,
): WorkspaceWheelOutcome[] {
  const metadata = parseTeamSessionMetadata(session);
  const rawOutcomes = metadata?.wheelOutcomes;

  if (!Array.isArray(rawOutcomes)) {
    return [];
  }

  return rawOutcomes.flatMap((outcome): WorkspaceWheelOutcome[] => {
    if (isResolvedRecapAction(outcome)) {
      return [];
    }

    if (!isRecord(outcome) || !isWorkspaceWheelMode(outcome.mode)) {
      return [];
    }

    const outcomeId = normaliseOptionalString(outcome.id);
    const id = buildWheelOutcomeActionId(session.id, outcomeId);
    const winner = normaliseOptionalString(outcome.winner);
    const resultLabel = normaliseOptionalString(outcome.resultLabel);
    if (
      !id ||
      !outcomeId ||
      !winner ||
      !resultLabel ||
      typeof outcome.timestamp !== "number" ||
      typeof outcome.recordedAt !== "number" ||
      typeof outcome.removedAfter !== "boolean"
    ) {
      return [];
    }

    return [
      {
        id: outcomeId,
        sessionId: session.id,
        mode: outcome.mode,
        resultLabel,
        winner,
        timestamp: outcome.timestamp,
        removedAfter: outcome.removedAfter,
        recordedAt: outcome.recordedAt,
        automation: Array.isArray(outcome.automation)
          ? outcome.automation.flatMap((suggestion) => {
              const parsed = parseWheelAutomationSuggestion(suggestion);
              return parsed ? [parsed] : [];
            })
          : [],
      },
    ];
  });
}

export function buildLinkedSessionRecapActions(
  recap: LinkedSessionSummary,
): LinkedSessionRecapAction[] {
  return [
    ...recap.planningFollowUps.flatMap((followUp) => {
      const session = recap.sessions.find(
        (candidate) => candidate.id === followUp.sessionId,
      );

      return session
        ? [
            {
              id: followUp.id,
              kind: "planning_follow_up" as const,
              sessionId: followUp.sessionId,
              teamId: session.teamId,
              title: followUp.title,
              detail: followUp.ticketKey ? `[${followUp.ticketKey}]` : null,
            },
          ]
        : [];
    }),
    ...recap.wheelOutcomes.flatMap((outcome) => {
      const sessionId = outcome.sessionId;
      const session = recap.sessions.find(
        (candidate) => candidate.id === sessionId,
      );
      const id =
        typeof sessionId === "number"
          ? buildWheelOutcomeActionId(sessionId, outcome.id)
          : null;

      return id && session
        ? [
            {
              id,
              kind: "wheel_outcome" as const,
              sessionId: session.id,
              teamId: session.teamId,
              title: `${outcome.resultLabel}: ${outcome.winner}`,
              detail: outcome.automation[0]?.label ?? null,
            },
          ]
        : [];
    }),
  ];
}

export function filterLinkedSessionSummaryActions(
  recap: LinkedSessionSummary,
  hiddenActionIds: ReadonlySet<string>,
): LinkedSessionSummary {
  const nextRecap: Omit<LinkedSessionSummary, "recapText"> = {
    ...recap,
    planningFollowUps: recap.planningFollowUps.filter(
      (followUp) => !hiddenActionIds.has(followUp.id),
    ),
    wheelOutcomes: recap.wheelOutcomes.filter((outcome) => {
      const actionId =
        typeof outcome.sessionId === "number"
          ? buildWheelOutcomeActionId(outcome.sessionId, outcome.id)
          : null;
      return !actionId || !hiddenActionIds.has(actionId);
    }),
  };

  return {
    ...nextRecap,
    recapText: buildLinkedSessionSummaryText(nextRecap),
  };
}

export function buildLinkedSessionSummaryText(
  recap: Omit<LinkedSessionSummary, "recapText">,
): string {
  const sessionLines = recap.sessions.map((session) => {
    const type = getTeamSessionType(session);
    const completed = session.completedAt
      ? `completed ${new Date(session.completedAt).toLocaleDateString()}`
      : "active";
    return `- ${session.name} (${type}, ${session.roomKey}, ${completed})`;
  });

  const followUpLines =
    recap.planningFollowUps.length > 0
      ? recap.planningFollowUps.map((followUp) => {
          const ticket = followUp.ticketKey ? ` [${followUp.ticketKey}]` : "";
          const detail = followUp.detail ? `: ${followUp.detail}` : "";
          return `- ${followUp.title}${ticket}${detail}`;
        })
      : ["No planning follow-ups captured."];
  const wheelOutcomeLines =
    recap.wheelOutcomes.length > 0
      ? recap.wheelOutcomes.map((outcome) => {
          const automation = outcome.automation[0]?.label
            ? `; next: ${outcome.automation[0].label}`
            : "";
          return `- ${outcome.resultLabel}: ${outcome.winner}${automation}`;
        })
      : ["No wheel outcomes captured."];

  return [
    recap.context.label,
    "",
    "Linked sessions",
    ...sessionLines,
    "",
    "Planning follow-ups",
    ...followUpLines,
    "",
    "Wheel outcomes",
    ...wheelOutcomeLines,
  ].join("\n");
}

export function buildLinkedSessionSummaries(
  sessions: TeamSession[],
): LinkedSessionSummary[] {
  const groups = new Map<string, LinkedSessionSummary>();

  [...sessions]
    .sort((left, right) => left.createdAt - right.createdAt)
    .forEach((session) => {
      const context = getLinkedSessionContext(session);
      if (!context) {
        return;
      }

      const existing = groups.get(context.id);
      const sessionType = getTeamSessionType(session);

      if (existing) {
        existing.sessions.push(session);
        existing.sessionTypes = Array.from(
          new Set([...existing.sessionTypes, sessionType]),
        );
        existing.planningFollowUps.push(...getPlanningFollowUps(session));
        existing.wheelOutcomes.push(...getWheelOutcomes(session));
        existing.recapText = buildLinkedSessionSummaryText(existing);
        return;
      }

      const recap: LinkedSessionSummary = {
        context,
        sessions: [session],
        sessionTypes: [sessionType],
        planningFollowUps: getPlanningFollowUps(session),
        wheelOutcomes: getWheelOutcomes(session),
        recapText: "",
      };
      recap.recapText = buildLinkedSessionSummaryText(recap);
      groups.set(context.id, recap);
    });

  return Array.from(groups.values()).filter((recap) => recap.sessions.length > 1);
}
