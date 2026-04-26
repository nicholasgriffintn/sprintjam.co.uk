import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { StandupWorkerEnv } from "@sprintjam/types";
import {
  getStandupSessionToken,
  checkBotProtection,
  validateRequestBodySize,
  resolveWorkspaceUserId
} from "@sprintjam/utils";

import {
  rootResponse,
  notFoundResponse,
  internalErrorResponse,
  jsonError,
} from "../lib/response";
import { createRateLimit, joinRateLimit } from "../lib/rate-limit";

async function handleWebSocket(
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

function getStandupId(standupKey: string): string {
  return `standup-${standupKey.toLowerCase()}`;
}

function getStandupStub(env: StandupWorkerEnv, standupKey: string) {
  const standupId = getStandupId(standupKey);
  return env.STANDUP_ROOM.get(env.STANDUP_ROOM.idFromName(standupId));
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
  const teamId = body?.teamId;

  if (!name) {
    return jsonError("Name is required");
  }

  const workspaceUserId = await resolveWorkspaceUserId(request, env.AUTH_WORKER);
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

  const workspaceUserId = await resolveWorkspaceUserId(request, env.AUTH_WORKER);
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

async function handleApiRoutes(
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

  return notFoundResponse("API");
}

export async function handleRequest(
  request: CfRequest,
  env: StandupWorkerEnv,
): Promise<CfResponse> {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === "" || pathname === "/") {
      return rootResponse("Standup Worker");
    }

    if (pathname === "/ws/standup") {
      return await handleWebSocket(request, env);
    }

    if (pathname.startsWith("/api/")) {
      const path = pathname.substring(5);
      return handleApiRoutes(request, env, path);
    }

    return notFoundResponse("Main");
  } catch (error) {
    console.error("[standup-worker] handleRequest errored:", error);
    return internalErrorResponse("standup-worker");
  }
}
