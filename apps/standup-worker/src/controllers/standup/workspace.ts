import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { StandupWorkerEnv } from "@sprintjam/types";

import { jsonError } from "../../lib/response";
import { validateStandupSessionForKey } from "./session-validation";

async function forwardAuthWorkspaceWrite(
  request: CfRequest,
  env: StandupWorkerEnv,
  path: string,
  body: Record<string, unknown>,
): Promise<CfResponse> {
  if (!env.AUTH_WORKER) {
    return jsonError("Workspace history is unavailable", 503);
  }

  return env.AUTH_WORKER.fetch(
    new Request(`https://auth-worker/api/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("Cookie") ?? "",
      },
      body: JSON.stringify(body),
    }) as unknown as CfRequest,
  );
}

async function forwardStatsWrite(
  env: StandupWorkerEnv,
  body: Record<string, unknown>,
): Promise<CfResponse> {
  if (!env.STATS_WORKER) {
    return jsonError("Stats collection is unavailable", 503);
  }

  return env.STATS_WORKER.fetch(
    new Request("https://stats-worker/api/internal/stats/standup-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as unknown as CfRequest,
  );
}

export async function createWorkspaceSessionController(
  request: CfRequest,
  env: StandupWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<{
    teamSlug?: string;
    name?: string;
    roomKey?: string;
    metadata?: Record<string, unknown>;
  }>();
  const teamSlug = typeof body.teamSlug === "string" ? body.teamSlug : "";
  const standupKey =
    typeof body.roomKey === "string" ? body.roomKey.trim().toUpperCase() : "";

  if (!teamSlug) {
    return jsonError("Team slug is required", 400);
  }

  if (!standupKey) {
    return jsonError("Standup key is required", 400);
  }

  const validationError = await validateStandupSessionForKey(
    request,
    env,
    standupKey,
    "moderator",
  );
  if (validationError) {
    return validationError;
  }

  return forwardAuthWorkspaceWrite(
    request,
    env,
    `internal/teams/${teamSlug}/sessions`,
    {
      name: body.name,
      roomKey: standupKey,
      metadata: body.metadata,
    },
  );
}

export async function completeWorkspaceSessionController(
  request: CfRequest,
  env: StandupWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<{ roomKey?: string }>();
  const standupKey =
    typeof body.roomKey === "string" ? body.roomKey.trim().toUpperCase() : "";

  if (!standupKey) {
    return jsonError("Standup key is required", 400);
  }

  const validationError = await validateStandupSessionForKey(
    request,
    env,
    standupKey,
    "moderator",
  );
  if (validationError) {
    return validationError;
  }

  return forwardAuthWorkspaceWrite(request, env, "internal/sessions/complete", {
    roomKey: standupKey,
  });
}

export async function recordWorkspaceActionsController(
  request: CfRequest,
  env: StandupWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<
    Record<string, unknown> & { roomKey?: string }
  >();
  const standupKey =
    typeof body.roomKey === "string" ? body.roomKey.trim().toUpperCase() : "";

  if (!standupKey) {
    return jsonError("Standup key is required", 400);
  }

  const validationError = await validateStandupSessionForKey(
    request,
    env,
    standupKey,
    "moderator",
  );
  if (validationError) {
    return validationError;
  }

  return forwardAuthWorkspaceWrite(
    request,
    env,
    "internal/sessions/standup-actions",
    {
      ...body,
      roomKey: standupKey,
    },
  );
}

export async function recordSessionStatsController(
  request: CfRequest,
  env: StandupWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<
    Record<string, unknown> & { roomKey?: string }
  >();
  const standupKey =
    typeof body.roomKey === "string" ? body.roomKey.trim().toUpperCase() : "";

  if (!standupKey) {
    return jsonError("Standup key is required", 400);
  }

  const validationError = await validateStandupSessionForKey(
    request,
    env,
    standupKey,
  );
  if (validationError) {
    return validationError;
  }

  return forwardStatsWrite(env, {
    ...body,
    roomKey: standupKey,
  });
}
