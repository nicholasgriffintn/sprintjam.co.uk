import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { RetroWorkerEnv } from "@sprintjam/types";
import { readJsonBody } from "@sprintjam/utils";

import { jsonError } from "../../lib/response";
import { validateRetroSessionForKey } from "./session-validation";

async function forwardAuthWorkspaceWrite(
  request: CfRequest,
  env: RetroWorkerEnv,
  path: string,
  body: Record<string, unknown>,
  unavailableMessage: string,
): Promise<CfResponse> {
  if (!env.AUTH_WORKER) {
    return jsonError(unavailableMessage, 503);
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

export async function createWorkspaceSessionController(
  request: CfRequest,
  env: RetroWorkerEnv,
): Promise<CfResponse> {
  const parsedBody = await readJsonBody<{
    teamSlug?: string;
    name?: string;
    roomKey?: string;
    metadata?: Record<string, unknown>;
  }>(request);
  if (!parsedBody.ok) {
    return parsedBody.response as CfResponse;
  }
  const body = parsedBody.body;
  const teamSlug = typeof body.teamSlug === "string" ? body.teamSlug : "";
  const retroKey =
    typeof body.roomKey === "string" ? body.roomKey.trim().toUpperCase() : "";

  if (!teamSlug || !retroKey) {
    return jsonError("Team slug and retro key are required", 400);
  }

  const validationError = await validateRetroSessionForKey(
    request,
    env,
    retroKey,
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
      roomKey: retroKey,
      metadata: body.metadata,
    },
    "Workspace history is unavailable",
  );
}

export async function recordWorkspaceActionsController(
  request: CfRequest,
  env: RetroWorkerEnv,
): Promise<CfResponse> {
  const parsedBody = await readJsonBody<
    Record<string, unknown> & { roomKey?: string }
  >(request);
  if (!parsedBody.ok) {
    return parsedBody.response as CfResponse;
  }
  const body = parsedBody.body;
  const retroKey =
    typeof body.roomKey === "string" ? body.roomKey.trim().toUpperCase() : "";

  if (!retroKey) {
    return jsonError("Retro key is required", 400);
  }

  const validationError = await validateRetroSessionForKey(
    request,
    env,
    retroKey,
    "moderator",
  );
  if (validationError) {
    return validationError;
  }

  return forwardAuthWorkspaceWrite(
    request,
    env,
    "internal/sessions/retro-actions",
    {
      ...body,
      roomKey: retroKey,
    },
    "Workspace actions are unavailable",
  );
}

export async function completeWorkspaceSessionController(
  request: CfRequest,
  env: RetroWorkerEnv,
): Promise<CfResponse> {
  const parsedBody = await readJsonBody<{ roomKey?: string }>(request);
  if (!parsedBody.ok) {
    return parsedBody.response as CfResponse;
  }
  const body = parsedBody.body;
  const retroKey =
    typeof body.roomKey === "string" ? body.roomKey.trim().toUpperCase() : "";

  if (!retroKey) {
    return jsonError("Retro key is required", 400);
  }

  const validationError = await validateRetroSessionForKey(
    request,
    env,
    retroKey,
    "moderator",
  );
  if (validationError) {
    return validationError;
  }

  return forwardAuthWorkspaceWrite(
    request,
    env,
    "internal/sessions/complete",
    { roomKey: retroKey },
    "Workspace history is unavailable",
  );
}
