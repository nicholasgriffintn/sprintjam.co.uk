import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { StandupWorkerEnv } from "@sprintjam/types";
import {
  getStandupSessionToken,
  checkBotProtection,
  validateRequestBodySize,
  resolveWorkspaceUserId,
} from "@sprintjam/utils";

import { jsonError, notFoundResponse } from "../../lib/response";
import { createRateLimit, joinRateLimit } from "../../lib/rate-limit";
import {
  getStandupStub,
  validateStandupSessionForKey,
} from "./session-validation";
import {
  completeWorkspaceSessionController,
  createWorkspaceSessionController,
  recordSessionStatsController,
  recordWorkspaceActionsController,
} from "./workspace";

export async function handleStandupWebSocket(
  request: CfRequest,
  env: StandupWorkerEnv,
): Promise<CfResponse> {
  if (request.headers.get("Upgrade") !== "websocket") {
    return jsonError("Expected WebSocket", 400);
  }

  const url = new URL(request.url);
  const standupKey = url.searchParams.get("standup");
  const userName = url.searchParams.get("name");
  const sessionToken = getStandupSessionToken(request);

  if (!standupKey || !userName || !sessionToken) {
    return jsonError("Missing standup key, user name, or session token", 400);
  }

  const standupStub = getStandupStub(env, standupKey);
  return standupStub.fetch(request);
}

function generateStandupKey(): string {
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .substring(0, 6)
    .toUpperCase();
}

async function createStandupController(
  request: CfRequest,
  env: StandupWorkerEnv,
): Promise<CfResponse> {
  const botCheck = checkBotProtection(
    request,
    env.ENABLE_STANDUP_RATE_LIMIT === "true",
  );

  if (botCheck) {
    return botCheck;
  }

  const rateLimitCheck = await createRateLimit(request, env);
  if (rateLimitCheck) {
    return rateLimitCheck;
  }

  const sizeCheck = validateRequestBodySize(request);
  if (!sizeCheck.ok) {
    return sizeCheck.response as CfResponse;
  }

  const body = await request.json<{
    name?: string;
    passcode?: string;
    avatar?: string;
    teamId?: number;
  }>();

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const passcode = body?.passcode;
  const avatar = body?.avatar;
  const rawTeamId = body?.teamId;
  const teamId =
    typeof rawTeamId === "number" &&
    Number.isInteger(rawTeamId) &&
    rawTeamId > 0
      ? rawTeamId
      : undefined;

  if (!name) {
    return jsonError("Name is required");
  }

  const authWorker = env.AUTH_WORKER;
  if (teamId !== undefined) {
    if (!authWorker) {
      return jsonError("Team access validation is unavailable", 503);
    }

    const authResponse = await authWorker.fetch(
      new Request(
        `https://auth-worker/api/internal/teams/${teamId}/write-access`,
        {
          method: "GET",
          headers: { Cookie: request.headers.get("Cookie") ?? "" },
        },
      ) as unknown as CfRequest,
    );
    if (!authResponse.ok) {
      return jsonError("You do not have access to the specified team", 403);
    }
  }

  const workspaceUserId = await resolveWorkspaceUserId(
    request,
    env.AUTH_WORKER,
  );
  const standupKey = generateStandupKey();
  const standupObject = getStandupStub(env, standupKey);

  return standupObject.fetch(
    new Request("https://internal/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        standupKey,
        moderator: name,
        passcode,
        avatar,
        teamId,
        workspaceUserId,
      }),
    }) as unknown as CfRequest,
  );
}

async function joinStandupController(
  request: CfRequest,
  env: StandupWorkerEnv,
): Promise<CfResponse> {
  const botCheck = checkBotProtection(
    request,
    env.ENABLE_STANDUP_RATE_LIMIT === "true",
  );

  if (botCheck) {
    return botCheck;
  }

  const rateLimitCheck = await joinRateLimit(request, env);
  if (rateLimitCheck) {
    return rateLimitCheck;
  }

  const sizeCheck = validateRequestBodySize(request);
  if (!sizeCheck.ok) {
    return sizeCheck.response as CfResponse;
  }

  const body = await request.json<{
    name?: string;
    standupKey?: string;
    passcode?: string;
    avatar?: string;
    authToken?: string;
  }>();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const standupKey =
    typeof body?.standupKey === "string"
      ? body.standupKey.trim().toUpperCase()
      : "";
  const passcode = body?.passcode;
  const avatar = body?.avatar;
  const authToken = body?.authToken;
  const sessionToken = getStandupSessionToken(request) ?? authToken;

  if (!name || !standupKey) {
    return jsonError("Name and standup key are required");
  }

  const workspaceUserId = await resolveWorkspaceUserId(
    request,
    env.AUTH_WORKER,
  );
  const standupObject = getStandupStub(env, standupKey);

  return standupObject.fetch(
    new Request("https://internal/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sessionToken ? { Cookie: `standup_session=${sessionToken}` } : {}),
      },
      body: JSON.stringify({ name, passcode, avatar, workspaceUserId }),
    }) as unknown as CfRequest,
  );
}

async function recoverStandupController(
  request: CfRequest,
  env: StandupWorkerEnv,
): Promise<CfResponse> {
  const sizeCheck = validateRequestBodySize(request);
  if (!sizeCheck.ok) {
    return sizeCheck.response as CfResponse;
  }

  const body = await request.json<{
    name?: string;
    standupKey?: string;
    recoveryPasskey?: string;
  }>();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const standupKey =
    typeof body?.standupKey === "string"
      ? body.standupKey.trim().toUpperCase()
      : "";
  const recoveryPasskey = body?.recoveryPasskey;

  if (!name || !standupKey || !recoveryPasskey) {
    return jsonError("Name, standup key, and recovery passkey are required");
  }

  const standupObject = getStandupStub(env, standupKey);

  return standupObject.fetch(
    new Request("https://internal/recover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, recoveryPasskey }),
    }) as unknown as CfRequest,
  );
}

async function validateStandupSessionController(
  request: CfRequest,
  env: StandupWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<{ standupKey?: string }>();
  const standupKey =
    typeof body?.standupKey === "string"
      ? body.standupKey.trim().toUpperCase()
      : "";

  if (!standupKey) {
    return jsonError("Standup key is required");
  }

  const validationError = await validateStandupSessionForKey(
    request,
    env,
    standupKey,
  );

  return (
    validationError ??
    new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );
}

export async function handleStandupApiRoute(
  request: CfRequest,
  env: StandupWorkerEnv,
  path: string,
): Promise<CfResponse> {
  const method = request.method;

  if (path === "standups" && method === "POST") {
    return createStandupController(request, env);
  }

  if (path === "standups/join" && method === "POST") {
    return joinStandupController(request, env);
  }

  if (path === "standups/recover" && method === "POST") {
    return recoverStandupController(request, env);
  }

  if (path === "standups/session/validate" && method === "POST") {
    return validateStandupSessionController(request, env);
  }

  if (path === "standups/workspace-sessions" && method === "POST") {
    return createWorkspaceSessionController(request, env);
  }

  if (path === "standups/workspace-sessions/complete" && method === "POST") {
    return completeWorkspaceSessionController(request, env);
  }

  if (path === "standups/workspace-actions" && method === "POST") {
    return recordWorkspaceActionsController(request, env);
  }

  if (path === "standups/session-stats" && method === "POST") {
    return recordSessionStatsController(request, env);
  }

  return notFoundResponse("API");
}
