import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { RetroWorkerEnv } from "@sprintjam/types";
import {
  checkBotProtection,
  getRetroSessionToken,
  resolveWorkspaceUserId,
  validateRequestBodySize,
} from "@sprintjam/utils";

import { createRateLimit, joinRateLimit } from "../lib/rate-limit";
import { jsonError, notFoundResponse, rootResponse } from "../lib/response";

function getRetroStub(env: RetroWorkerEnv, retroKey: string) {
  const id = env.RETRO_ROOM.idFromName(retroKey);
  return env.RETRO_ROOM.get(id);
}

function generateRetroKey(): string {
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .substring(0, 6)
    .toUpperCase();
}

export async function handleRequest(
  request: CfRequest,
  env: RetroWorkerEnv,
): Promise<CfResponse> {
  const url = new URL(request.url);
  const path = url.pathname.startsWith("/api/")
    ? url.pathname.substring(5)
    : url.pathname.substring(1);

  if (url.pathname === "/") {
    return rootResponse();
  }

  if (url.pathname === "/ws/retro") {
    return handleRetroWebSocket(request, env);
  }

  if (request.method === "POST" && path === "retros") {
    return createRetroController(request, env);
  }

  if (request.method === "POST" && path === "retros/join") {
    return joinRetroController(request, env);
  }

  if (request.method === "GET" && path === "retros/settings") {
    return getRetroSettingsController(request, env);
  }

  if (request.method === "POST" && path === "retros/workspace-sessions") {
    return createWorkspaceSessionController(request, env);
  }

  if (request.method === "POST" && path === "retros/workspace-actions") {
    return recordWorkspaceActionsController(request, env);
  }

  if (
    request.method === "POST" &&
    path === "retros/workspace-sessions/complete"
  ) {
    return completeWorkspaceSessionController(request, env);
  }

  return notFoundResponse();
}

async function handleRetroWebSocket(
  request: CfRequest,
  env: RetroWorkerEnv,
): Promise<CfResponse> {
  if (request.headers.get("Upgrade") !== "websocket") {
    return jsonError("Expected WebSocket", 400);
  }

  const url = new URL(request.url);
  const retroKey = url.searchParams.get("retro");
  const userName = url.searchParams.get("name");
  const sessionToken = getRetroSessionToken(request);

  if (!retroKey || !userName || !sessionToken) {
    return jsonError("Missing retro key, user name, or session token", 400);
  }

  return getRetroStub(env, retroKey).fetch(request);
}

async function createRetroController(
  request: CfRequest,
  env: RetroWorkerEnv,
): Promise<CfResponse> {
  const botCheck = checkBotProtection(
    request,
    env.ENABLE_RETRO_RATE_LIMIT === "true",
  );
  if (botCheck) {
    return botCheck as CfResponse;
  }

  const rateLimitCheck = await createRateLimit(request, env);
  if (rateLimitCheck) {
    return rateLimitCheck as CfResponse;
  }

  const sizeCheck = validateRequestBodySize(request);
  if (!sizeCheck.ok) {
    return sizeCheck.response as CfResponse;
  }

  const body = await request.json<{
    name?: string;
    passcode?: string;
    settings?: Record<string, unknown>;
    templateId?: string;
    avatar?: string;
  }>();
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return jsonError("Name is required", 400);
  }

  const retroKey = generateRetroKey();
  const workspaceUserId = await resolveWorkspaceUserId(
    request,
    env.AUTH_WORKER,
  );

  return getRetroStub(env, retroKey).fetch(
    new Request("https://internal/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        retroKey,
        moderator: name,
        passcode: body.passcode,
        settings: body.settings,
        templateId: body.templateId,
        avatar: body.avatar,
        workspaceUserId,
      }),
    }) as unknown as CfRequest,
  );
}

async function joinRetroController(
  request: CfRequest,
  env: RetroWorkerEnv,
): Promise<CfResponse> {
  const botCheck = checkBotProtection(
    request,
    env.ENABLE_RETRO_RATE_LIMIT === "true",
  );
  if (botCheck) {
    return botCheck as CfResponse;
  }

  const rateLimitCheck = await joinRateLimit(request, env);
  if (rateLimitCheck) {
    return rateLimitCheck as CfResponse;
  }

  const sizeCheck = validateRequestBodySize(request);
  if (!sizeCheck.ok) {
    return sizeCheck.response as CfResponse;
  }

  const body = await request.json<{
    name?: string;
    retroKey?: string;
    passcode?: string;
    avatar?: string;
    authToken?: string;
  }>();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const retroKey =
    typeof body.retroKey === "string" ? body.retroKey.trim().toUpperCase() : "";
  const sessionToken = getRetroSessionToken(request) ?? body.authToken;

  if (!name || !retroKey) {
    return jsonError("Name and retro key are required", 400);
  }

  const workspaceUserId = await resolveWorkspaceUserId(
    request,
    env.AUTH_WORKER,
  );

  return getRetroStub(env, retroKey).fetch(
    new Request("https://internal/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sessionToken ? { Cookie: `retro_session=${sessionToken}` } : {}),
      },
      body: JSON.stringify({
        name,
        passcode: body.passcode,
        avatar: body.avatar,
        workspaceUserId,
      }),
    }) as unknown as CfRequest,
  );
}

async function getRetroSettingsController(
  request: CfRequest,
  env: RetroWorkerEnv,
): Promise<CfResponse> {
  const url = new URL(request.url);
  const retroKey = url.searchParams.get("retroKey");
  const name = url.searchParams.get("name");
  const sessionToken = getRetroSessionToken(request);

  if (!retroKey) {
    return jsonError("Retro key is required", 400);
  }

  const settingsUrl = new URL("https://internal/settings");
  if (name) {
    settingsUrl.searchParams.set("name", name);
  }

  return getRetroStub(env, retroKey).fetch(
    new Request(settingsUrl.toString(), {
      method: "GET",
      headers: {
        ...(sessionToken ? { Cookie: `retro_session=${sessionToken}` } : {}),
      },
    }) as unknown as CfRequest,
  );
}

async function validateRetroSessionForKey(
  request: CfRequest,
  env: RetroWorkerEnv,
  retroKey: string,
  mode: "any" | "moderator" = "any",
): Promise<CfResponse | null> {
  const sessionToken = getRetroSessionToken(request);
  if (!sessionToken) {
    return jsonError("Retro session is required", 401);
  }

  const response = await getRetroStub(env, retroKey).fetch(
    new Request(`https://internal/session/validate-${mode}`, {
      method: "POST",
      headers: {
        Cookie: `retro_session=${sessionToken}`,
      },
    }) as unknown as CfRequest,
  );

  return response.ok ? null : (response as CfResponse);
}

async function createWorkspaceSessionController(
  request: CfRequest,
  env: RetroWorkerEnv,
): Promise<CfResponse> {
  if (!env.AUTH_WORKER) {
    return jsonError("Workspace history is unavailable", 503);
  }

  const body = await request.json<{
    teamSlug?: string;
    name?: string;
    roomKey?: string;
    metadata?: Record<string, unknown>;
  }>();
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

  return env.AUTH_WORKER.fetch(
    new Request(`https://auth-worker/api/internal/teams/${teamSlug}/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("Cookie") ?? "",
      },
      body: JSON.stringify({
        name: body.name,
        roomKey: retroKey,
        metadata: body.metadata,
      }),
    }) as unknown as CfRequest,
  );
}

async function recordWorkspaceActionsController(
  request: CfRequest,
  env: RetroWorkerEnv,
): Promise<CfResponse> {
  if (!env.AUTH_WORKER) {
    return jsonError("Workspace actions are unavailable", 503);
  }

  const body = await request.json<
    Record<string, unknown> & { roomKey?: string }
  >();
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

  return env.AUTH_WORKER.fetch(
    new Request("https://auth-worker/api/internal/sessions/retro-actions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("Cookie") ?? "",
      },
      body: JSON.stringify({
        ...body,
        roomKey: retroKey,
      }),
    }) as unknown as CfRequest,
  );
}

async function completeWorkspaceSessionController(
  request: CfRequest,
  env: RetroWorkerEnv,
): Promise<CfResponse> {
  if (!env.AUTH_WORKER) {
    return jsonError("Workspace history is unavailable", 503);
  }

  const body = await request.json<{ roomKey?: string }>();
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

  return env.AUTH_WORKER.fetch(
    new Request("https://auth-worker/api/internal/sessions/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("Cookie") ?? "",
      },
      body: JSON.stringify({ roomKey: retroKey }),
    }) as unknown as CfRequest,
  );
}
