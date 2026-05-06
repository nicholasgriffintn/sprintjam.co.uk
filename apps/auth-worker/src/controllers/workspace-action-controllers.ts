import type {
  AuthWorkerEnv,
  CreateWorkspaceActionInput,
  CreateWorkspaceProcessLoopInput,
  RecordPlanningWorkspaceActionsInput,
  RecordStandupWorkspaceActionsInput,
  SpinResult,
  UpdateWorkspaceActionInput,
  WheelMode,
  WorkspaceActionSource,
  WorkspaceActionSourceFilter,
  WorkspaceActionStatusFilter,
} from "@sprintjam/types";
import {
  buildPaginationMeta,
  buildPlanningActionIntents,
  buildStandupBlockerActionIntents,
  buildStandupNextStepActionIntents,
  buildWheelActionIntent,
  buildWorkspaceWheelOutcome,
  isPaginationError,
  isWorkspaceActionPriority,
  isWorkspaceActionSource,
  isWorkspaceActionStatus,
  isWorkspaceProcessLoopStatus,
  isWorkspaceWheelMode,
  normaliseOptionalString,
  parsePagination,
  parseWorkspaceProcessLoopIntent,
} from "@sprintjam/utils";

import type { AuthResult } from "../lib/auth";
import {
  forbiddenResponse,
  jsonError,
  jsonResponse,
  notFoundResponse,
} from "../lib/response";
import {
  parseOptionalNumber,
  parseOptionalString,
  parseTeamSessionMetadata,
} from "./controller-parsing";
import {
  getAuthOrError,
  getTeamViewer,
  getWorkspaceViewer,
} from "./workspace-viewer";

const MAX_ACTION_TITLE_LENGTH = 200;
const MAX_ACTION_DETAIL_LENGTH = 2000;
const MAX_PROCESS_LOOP_NAME_LENGTH = 160;
const MAX_PROCESS_LOOP_GOAL_LENGTH = 2000;
const DEFAULT_WORKSPACE_ACTIONS_LIMIT = 50;
const ACTION_STATUS_FILTERS = new Set<WorkspaceActionStatusFilter>([
  "all",
  "open",
  "in_progress",
  "resolved",
  "dismissed",
]);
const ACTION_SOURCE_FILTERS = new Set<WorkspaceActionSourceFilter>([
  "all",
  "planning",
  "standup",
  "wheel",
  "manual",
]);

function parseWorkspaceActionStatusFilter(
  url: URL,
): WorkspaceActionStatusFilter | { error: string } {
  const rawStatus = url.searchParams.get("status") ?? "all";

  if (ACTION_STATUS_FILTERS.has(rawStatus as WorkspaceActionStatusFilter)) {
    return rawStatus as WorkspaceActionStatusFilter;
  }

  return {
    error: "status must be one of all, open, in_progress, resolved, or dismissed",
  };
}

function parseWorkspaceActionSourceFilter(
  url: URL,
): WorkspaceActionSourceFilter | { error: string } {
  const rawSource = url.searchParams.get("source") ?? "all";

  if (ACTION_SOURCE_FILTERS.has(rawSource as WorkspaceActionSourceFilter)) {
    return rawSource as WorkspaceActionSourceFilter;
  }

  return {
    error: "source must be one of all, planning, standup, wheel, or manual",
  };
}

function parseProcessLoopBody(
  body: CreateWorkspaceProcessLoopInput,
): CreateWorkspaceProcessLoopInput & { key: string } | { error: string } {
  const name = parseOptionalString(
    body.name,
    "Process loop name",
    MAX_PROCESS_LOOP_NAME_LENGTH,
  );
  if (!name || typeof name !== "string") {
    return {
      error:
        name && typeof name === "object"
          ? name.error
          : "Process loop name is required",
    };
  }

  const key =
    normaliseOptionalString(body.key) ?? `loop-${Date.now().toString(36)}`;
  const goal = parseOptionalString(
    body.goal,
    "Process loop goal",
    MAX_PROCESS_LOOP_GOAL_LENGTH,
  );
  if (goal && typeof goal === "object") {
    return goal;
  }

  if (body.status !== undefined && !isWorkspaceProcessLoopStatus(body.status)) {
    return {
      error: "Process loop status must be planned, active, or completed",
    };
  }

  const startsAt = parseOptionalNumber(body.startsAt, "startsAt");
  if (startsAt && typeof startsAt === "object") {
    return startsAt;
  }

  const endsAt = parseOptionalNumber(body.endsAt, "endsAt");
  if (endsAt && typeof endsAt === "object") {
    return endsAt;
  }

  return {
    key,
    name,
    goal,
    status: body.status,
    startsAt,
    endsAt,
  };
}

function parseWorkspaceActionBody(
  body: CreateWorkspaceActionInput,
):
  | (CreateWorkspaceActionInput & {
      source: WorkspaceActionSource;
      sourceRef: string;
      title: string;
    })
  | { error: string } {
  const title = parseOptionalString(
    body.title,
    "Action title",
    MAX_ACTION_TITLE_LENGTH,
  );
  if (!title || typeof title !== "string") {
    return {
      error:
        title && typeof title === "object"
          ? title.error
          : "Action title is required",
    };
  }

  const detail = parseOptionalString(
    body.detail,
    "Action detail",
    MAX_ACTION_DETAIL_LENGTH,
  );
  if (detail && typeof detail === "object") {
    return detail;
  }

  const source = body.source ?? "manual";
  if (!isWorkspaceActionSource(source)) {
    return { error: "Action source must be planning, standup, wheel, or manual" };
  }

  const priority = body.priority ?? "normal";
  if (!isWorkspaceActionPriority(priority)) {
    return { error: "Action priority must be low, normal, or high" };
  }

  const dueAt = parseOptionalNumber(body.dueAt, "dueAt");
  if (dueAt && typeof dueAt === "object") {
    return dueAt;
  }

  const processLoopId = parseOptionalNumber(
    body.processLoopId,
    "processLoopId",
  );
  if (processLoopId && typeof processLoopId === "object") {
    return processLoopId;
  }

  const sourceSessionId = parseOptionalNumber(
    body.sourceSessionId,
    "sourceSessionId",
  );
  if (sourceSessionId && typeof sourceSessionId === "object") {
    return sourceSessionId;
  }

  const ownerUserId = parseOptionalNumber(body.ownerUserId, "ownerUserId");
  if (ownerUserId && typeof ownerUserId === "object") {
    return ownerUserId;
  }

  return {
    ...body,
    title,
    detail,
    source,
    sourceRef:
      normaliseOptionalString(body.sourceRef) ?? `manual-${crypto.randomUUID()}`,
    priority,
    dueAt,
    processLoopId,
    sourceSessionId,
    ownerUserId,
    ownerName: normaliseOptionalString(body.ownerName),
    externalProvider: normaliseOptionalString(body.externalProvider),
    externalTicketKey: normaliseOptionalString(body.externalTicketKey),
    externalTicketUrl: normaliseOptionalString(body.externalTicketUrl),
  };
}

function parseWorkspaceActionUpdateBody(
  body: UpdateWorkspaceActionInput,
): UpdateWorkspaceActionInput | { error: string } {
  const updates: UpdateWorkspaceActionInput = {};
  if (body.title !== undefined) {
    const title = parseOptionalString(
      body.title,
      "Action title",
      MAX_ACTION_TITLE_LENGTH,
    );
    if (!title || typeof title !== "string") {
      return {
        error:
          title && typeof title === "object"
            ? title.error
            : "Action title is required",
      };
    }
    updates.title = title;
  }

  const stringFields = [
    "detail",
    "ownerName",
    "externalProvider",
    "externalTicketKey",
    "externalTicketUrl",
  ] as const;

  for (const field of stringFields) {
    if (body[field] !== undefined) {
      const parsed = parseOptionalString(
        body[field],
        field,
        MAX_ACTION_DETAIL_LENGTH,
      );
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
      updates[field] = normaliseOptionalString(body[field]);
    }
  }

  if (body.status !== undefined) {
    if (!isWorkspaceActionStatus(body.status)) {
      return {
        error: "Action status must be open, in_progress, resolved, or dismissed",
      };
    }
    updates.status = body.status;
  }

  if (body.priority !== undefined) {
    if (!isWorkspaceActionPriority(body.priority)) {
      return { error: "Action priority must be low, normal, or high" };
    }
    updates.priority = body.priority;
  }

  for (const field of ["processLoopId", "ownerUserId", "dueAt"] as const) {
    if (body[field] !== undefined) {
      const parsed = parseOptionalNumber(body[field], field);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
      updates[field] = parsed;
    }
  }

  if (body.metadata !== undefined) {
    updates.metadata = body.metadata;
  }

  return updates;
}

function parseWheelOutcomeBody(body: {
  result?: Partial<SpinResult>;
  mode?: WheelMode;
}):
  | { mode: WheelMode; result: SpinResult }
  | { error: string } {
  const id = normaliseOptionalString(body.result?.id);
  const winner = normaliseOptionalString(body.result?.winner);
  const timestamp = body.result?.timestamp;
  const removedAfter = body.result?.removedAfter;
  const mode = body.mode;

  if (!id || !winner) {
    return { error: "Wheel result id and winner are required" };
  }

  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    return { error: "Wheel result timestamp is required" };
  }

  if (typeof removedAfter !== "boolean") {
    return { error: "Wheel result removedAfter flag is required" };
  }

  if (!isWorkspaceWheelMode(mode)) {
    return { error: "Wheel mode must be decision, reviewer, or facilitator" };
  }

  return {
    mode,
    result: {
      id,
      winner,
      timestamp,
      removedAfter,
    },
  };
}

export async function applySessionProcessLoopMetadata(params: {
  repo: AuthResult["repo"];
  teamId: number;
  sessionId: number;
  createdById: number;
  metadata?: Record<string, unknown>;
}) {
  const processLoopIntent = parseWorkspaceProcessLoopIntent(
    params.metadata?.processLoop,
  );
  const processLoop = processLoopIntent
    ? await params.repo.getOrCreateWorkspaceProcessLoop({
        teamId: params.teamId,
        key: processLoopIntent.key,
        name: processLoopIntent.name,
        goal: processLoopIntent.goal,
        status: processLoopIntent.status,
        startsAt: processLoopIntent.startsAt,
        endsAt: processLoopIntent.endsAt,
        createdById: params.createdById,
      })
    : null;

  if (processLoop) {
    await params.repo.linkTeamSessionToProcessLoop({
      teamId: params.teamId,
      processLoopId: processLoop.id,
      sessionId: params.sessionId,
      linkedById: params.createdById,
    });
  }
}

export async function listWorkspaceProcessLoopsController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) return auth.response;

  const teamViewer = await getTeamViewer(auth.result, teamId);
  if ("response" in teamViewer) return teamViewer.response;

  if (!teamViewer.viewer.canAccess) {
    return forbiddenResponse("You do not have access to process loops");
  }

  const loops = await auth.result.repo.listWorkspaceProcessLoops(teamId);
  return jsonResponse({ loops });
}

export async function createWorkspaceProcessLoopController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) return auth.response;

  const teamViewer = await getTeamViewer(auth.result, teamId);
  if ("response" in teamViewer) return teamViewer.response;

  if (!teamViewer.viewer.canAccess) {
    return forbiddenResponse("You do not have access to process loops");
  }

  const body = await request.json<CreateWorkspaceProcessLoopInput>();
  const parsed = parseProcessLoopBody(body);
  if ("error" in parsed) return jsonError(parsed.error, 400);

  const loopId = await auth.result.repo.createWorkspaceProcessLoop(teamId, {
    ...parsed,
    createdById: auth.result.userId,
  });
  const loop = await auth.result.repo.getWorkspaceProcessLoopById(loopId);

  return jsonResponse({ loop }, 201);
}

export async function linkTeamSessionToProcessLoopController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
  sessionId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) return auth.response;

  const teamViewer = await getTeamViewer(auth.result, teamId);
  if ("response" in teamViewer) return teamViewer.response;

  if (!teamViewer.viewer.canAccess) {
    return forbiddenResponse("You do not have access to team sessions");
  }

  const session = await auth.result.repo.getTeamSessionById(sessionId);
  if (!session || session.teamId !== teamId) {
    return notFoundResponse("Session not found");
  }

  const body = await request.json<{ processLoopId?: unknown }>();
  const processLoopId = parseOptionalNumber(
    body.processLoopId,
    "processLoopId",
  );
  if (processLoopId && typeof processLoopId === "object") {
    return jsonError(processLoopId.error, 400);
  }
  if (processLoopId === null) {
    return jsonError("Process loop id is required", 400);
  }

  const processLoop =
    await auth.result.repo.getWorkspaceProcessLoopById(processLoopId);
  if (!processLoop || processLoop.teamId !== teamId) {
    return notFoundResponse("Process loop not found");
  }

  await auth.result.repo.linkTeamSessionToProcessLoop({
    teamId,
    processLoopId,
    sessionId,
    linkedById: auth.result.userId,
  });

  return jsonResponse({ session, processLoop });
}

export async function listWorkspaceActionsController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) return auth.response;

  const teamViewer = await getTeamViewer(auth.result, teamId);
  if ("response" in teamViewer) return teamViewer.response;

  if (!teamViewer.viewer.canAccess) {
    return forbiddenResponse("You do not have access to workspace actions");
  }

  const url = new URL(request.url);
  const pagination = parsePagination(url, {
    defaultLimit: DEFAULT_WORKSPACE_ACTIONS_LIMIT,
  });
  if (isPaginationError(pagination)) {
    return jsonError(pagination.error, 400);
  }

  const status = parseWorkspaceActionStatusFilter(url);
  if (typeof status === "object") return jsonError(status.error, 400);

  const source = parseWorkspaceActionSourceFilter(url);
  if (typeof source === "object") return jsonError(source.error, 400);

  const processLoopIdParam = url.searchParams.get("processLoopId");
  const processLoopId =
    processLoopIdParam === null
      ? undefined
      : Number.parseInt(processLoopIdParam, 10);
  if (processLoopIdParam !== null && Number.isNaN(processLoopId)) {
    return jsonError("processLoopId must be a number", 400);
  }

  const [actions, counts] = await Promise.all([
    auth.result.repo.listWorkspaceActions(teamId, pagination, {
      status,
      source,
      processLoopId,
    }),
    auth.result.repo.getWorkspaceActionCounts(teamId, {
      source,
      processLoopId,
    }),
  ]);

  return jsonResponse({
    actions,
    pagination: buildPaginationMeta(pagination, counts[status]),
    counts,
  });
}

export async function createWorkspaceActionController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) return auth.response;

  const teamViewer = await getTeamViewer(auth.result, teamId);
  if ("response" in teamViewer) return teamViewer.response;

  if (!teamViewer.viewer.canAccess) {
    return forbiddenResponse("You do not have access to workspace actions");
  }

  const body = await request.json<CreateWorkspaceActionInput>();
  const parsed = parseWorkspaceActionBody(body);
  if ("error" in parsed) return jsonError(parsed.error, 400);

  if (parsed.processLoopId) {
    const processLoop = await auth.result.repo.getWorkspaceProcessLoopById(
      parsed.processLoopId,
    );
    if (!processLoop || processLoop.teamId !== teamId) {
      return notFoundResponse("Process loop not found");
    }
  }

  const actionId = await auth.result.repo.upsertWorkspaceAction({
    teamId,
    createdById: auth.result.userId,
    ...parsed,
  });
  const action = await auth.result.repo.getWorkspaceActionById(actionId);

  return jsonResponse({ action }, 201);
}

export async function updateWorkspaceActionController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
  actionId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) return auth.response;

  const teamViewer = await getTeamViewer(auth.result, teamId);
  if ("response" in teamViewer) return teamViewer.response;

  if (!teamViewer.viewer.canAccess) {
    return forbiddenResponse("You do not have access to workspace actions");
  }

  const action = await auth.result.repo.getWorkspaceActionById(actionId);
  if (!action || action.teamId !== teamId) {
    return notFoundResponse("Action not found");
  }

  const body = await request.json<UpdateWorkspaceActionInput>();
  const parsed = parseWorkspaceActionUpdateBody(body);
  if ("error" in parsed) return jsonError(parsed.error, 400);

  if (parsed.processLoopId) {
    const processLoop = await auth.result.repo.getWorkspaceProcessLoopById(
      parsed.processLoopId,
    );
    if (!processLoop || processLoop.teamId !== teamId) {
      return notFoundResponse("Process loop not found");
    }
  }

  await auth.result.repo.updateWorkspaceAction(actionId, {
    ...parsed,
    resolvedById:
      parsed.status === "resolved" || parsed.status === "dismissed"
        ? auth.result.userId
        : parsed.status
          ? null
          : undefined,
  });

  const eventType =
    parsed.status && parsed.status !== action.status
      ? "status_changed"
      : "updated";
  await auth.result.repo.createWorkspaceActionEvent({
    teamId,
    actionId,
    actorUserId: auth.result.userId,
    eventType,
    fromStatus: eventType === "status_changed" ? action.status : null,
    toStatus: eventType === "status_changed" ? parsed.status : null,
  });

  const updatedAction = await auth.result.repo.getWorkspaceActionById(actionId);
  return jsonResponse({ action: updatedAction });
}

export async function createWorkspaceActionEventController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
  actionId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) return auth.response;

  const teamViewer = await getTeamViewer(auth.result, teamId);
  if ("response" in teamViewer) return teamViewer.response;

  if (!teamViewer.viewer.canAccess) {
    return forbiddenResponse("You do not have access to workspace actions");
  }

  const action = await auth.result.repo.getWorkspaceActionById(actionId);
  if (!action || action.teamId !== teamId) {
    return notFoundResponse("Action not found");
  }

  const body = await request.json<{
    eventType?: unknown;
    note?: unknown;
    metadata?: Record<string, unknown> | null;
  }>();
  const note = parseOptionalString(body.note, "Event note", 2000);
  if (note && typeof note === "object") {
    return jsonError(note.error, 400);
  }
  const eventType =
    body.eventType === "updated" ||
    body.eventType === "status_changed" ||
    body.eventType === "commented"
      ? body.eventType
      : "commented";

  const eventId = await auth.result.repo.createWorkspaceActionEvent({
    teamId,
    actionId,
    actorUserId: auth.result.userId,
    eventType,
    note,
    metadata: body.metadata ?? null,
  });
  const events = await auth.result.repo.listWorkspaceActionEvents(actionId);
  const event = events.find((item) => item.id === eventId) ?? null;

  return jsonResponse({ event }, 201);
}

export async function recordWheelOutcomeByRoomKeyController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) return auth.response;

  const workspace = await getWorkspaceViewer(auth.result);
  if ("response" in workspace) return workspace.response;

  const body = await request.json<{
    roomKey?: string;
    mode?: WheelMode;
    result?: Partial<SpinResult>;
  }>();
  const roomKey = body?.roomKey?.trim();
  if (!roomKey) return jsonError("Room key is required", 400);

  const parsedOutcome = parseWheelOutcomeBody(body);
  if ("error" in parsedOutcome) return jsonError(parsedOutcome.error, 400);

  const repo = auth.result.repo;
  const session = await repo.getAccessibleTeamSessionByRoomKey(
    roomKey,
    workspace.viewer.user.organisationId,
    auth.result.userId,
    workspace.viewer.isWorkspaceAdmin,
  );
  if (!session) return notFoundResponse("Session not found");

  const metadata = parseTeamSessionMetadata(session.metadata);
  if (metadata?.type !== "wheel") {
    return jsonError("Session is not a wheel session", 409);
  }

  const outcome = buildWorkspaceWheelOutcome(
    parsedOutcome.result,
    parsedOutcome.mode,
  );
  const actionIntent = buildWheelActionIntent(
    session.id,
    parsedOutcome.mode,
    parsedOutcome.result,
    outcome.resultLabel,
    outcome.automation[0]?.label,
  );
  if (!actionIntent) {
    return jsonError("Wheel action could not be created", 400);
  }

  const processLoop = await repo.getProcessLoopForSession(session.id);
  await repo.upsertWorkspaceAction({
    teamId: session.teamId,
    processLoopId: processLoop?.id ?? null,
    sourceSessionId: session.id,
    createdById: auth.result.userId,
    ...actionIntent,
  });
  const updatedSession = await repo.getTeamSessionById(session.id);

  return jsonResponse({ session: updatedSession });
}

export async function recordPlanningActionsByRoomKeyController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) return auth.response;

  const workspace = await getWorkspaceViewer(auth.result);
  if ("response" in workspace) return workspace.response;

  const body = await request.json<RecordPlanningWorkspaceActionsInput>();
  const roomKey = body?.roomKey?.trim();
  if (!roomKey) return jsonError("Room key is required", 400);

  const repo = auth.result.repo;
  const session = await repo.getAccessibleTeamSessionByRoomKey(
    roomKey,
    workspace.viewer.user.organisationId,
    auth.result.userId,
    workspace.viewer.isWorkspaceAdmin,
  );
  if (!session) return notFoundResponse("Session not found");

  const metadata = parseTeamSessionMetadata(session.metadata);
  if (metadata?.type !== "planning") {
    return jsonError("Session is not a planning session", 409);
  }

  const actionIntents = buildPlanningActionIntents(
    session.id,
    body.followUps ?? [],
  );
  const processLoop = await repo.getProcessLoopForSession(session.id);
  const actionIds = await Promise.all(
    actionIntents.map((intent) =>
      repo.upsertWorkspaceAction({
        teamId: session.teamId,
        processLoopId: processLoop?.id ?? null,
        sourceSessionId: session.id,
        createdById: auth.result.userId,
        ...intent,
      }),
    ),
  );

  return jsonResponse({ actionIds });
}

export async function recordStandupActionsByRoomKeyController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) return auth.response;

  const workspace = await getWorkspaceViewer(auth.result);
  if ("response" in workspace) return workspace.response;

  const body = await request.json<RecordStandupWorkspaceActionsInput>();
  const roomKey = body?.roomKey?.trim();
  if (!roomKey) return jsonError("Room key is required", 400);

  const repo = auth.result.repo;
  const session = await repo.getAccessibleTeamSessionByRoomKey(
    roomKey,
    workspace.viewer.user.organisationId,
    auth.result.userId,
    workspace.viewer.isWorkspaceAdmin,
  );
  if (!session) return notFoundResponse("Session not found");

  const metadata = parseTeamSessionMetadata(session.metadata);
  if (metadata?.type !== "standup") {
    return jsonError("Session is not a standup session", 409);
  }

  const actionIntents = [
    ...buildStandupBlockerActionIntents(body.blockers ?? []),
    ...buildStandupNextStepActionIntents(body.nextSteps ?? []),
  ];
  const processLoop = await repo.getProcessLoopForSession(session.id);
  const actionIds = await Promise.all(
    actionIntents.map((intent) =>
      repo.upsertWorkspaceAction({
        teamId: session.teamId,
        processLoopId: processLoop?.id ?? null,
        sourceSessionId: session.id,
        createdById: auth.result.userId,
        ...intent,
      }),
    ),
  );

  return jsonResponse({ actionIds });
}
