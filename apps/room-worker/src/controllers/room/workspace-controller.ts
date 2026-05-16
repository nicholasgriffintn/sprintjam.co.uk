import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { RoomWorkerEnv } from "@sprintjam/types";
import { getRoomSessionTokenForRoom, getRoomStub } from "@sprintjam/utils";

import { jsonError } from "../../lib/response";

async function validateRoomSessionForKey(
  request: CfRequest,
  env: RoomWorkerEnv,
  roomKey: string,
): Promise<CfResponse | null> {
  const sessionToken = getRoomSessionTokenForRoom(request, roomKey);
  if (!sessionToken) {
    return jsonError("Room session is required", 401);
  }

  const response = await getRoomStub(env, roomKey).fetch(
    new Request("https://internal/session/validate-any", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken }),
    }) as unknown as CfRequest,
  );

  return response.ok ? null : (response as CfResponse);
}

async function forwardAuthWorkspaceWrite(
  request: CfRequest,
  env: RoomWorkerEnv,
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

export async function createWorkspaceSessionController(
  request: CfRequest,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<{
    teamSlug?: string;
    name?: string;
    roomKey?: string;
    metadata?: Record<string, unknown>;
  }>();
  const teamSlug = typeof body.teamSlug === "string" ? body.teamSlug : "";
  const roomKey = typeof body.roomKey === "string" ? body.roomKey.trim() : "";

  if (!teamSlug) {
    return jsonError("Team slug is required", 400);
  }

  if (!roomKey) {
    return jsonError("Room key is required", 400);
  }

  const validationError = await validateRoomSessionForKey(
    request,
    env,
    roomKey,
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
      roomKey,
      metadata: body.metadata,
    },
  );
}

export async function completeWorkspaceSessionController(
  request: CfRequest,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<{ roomKey?: string }>();
  const roomKey = typeof body.roomKey === "string" ? body.roomKey.trim() : "";

  if (!roomKey) {
    return jsonError("Room key is required", 400);
  }

  const validationError = await validateRoomSessionForKey(
    request,
    env,
    roomKey,
  );
  if (validationError) {
    return validationError;
  }

  return forwardAuthWorkspaceWrite(request, env, "internal/sessions/complete", {
    roomKey,
  });
}

export async function recordPlanningActionsController(
  request: CfRequest,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<
    Record<string, unknown> & { roomKey?: string }
  >();
  const roomKey = typeof body.roomKey === "string" ? body.roomKey.trim() : "";

  if (!roomKey) {
    return jsonError("Room key is required", 400);
  }

  const validationError = await validateRoomSessionForKey(
    request,
    env,
    roomKey,
  );
  if (validationError) {
    return validationError;
  }

  return forwardAuthWorkspaceWrite(
    request,
    env,
    "internal/sessions/planning-actions",
    {
      ...body,
      roomKey,
    },
  );
}
