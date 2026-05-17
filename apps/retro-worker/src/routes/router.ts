import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { RetroWorkerEnv } from "@sprintjam/types";
import {
  checkBotProtection,
  getRetroSessionToken,
  readJsonBody,
  resolveWorkspaceUserId,
  secureRandomString,
  validateRequestBodySize,
} from "@sprintjam/utils";

import {
  completeWorkspaceSessionController,
  createWorkspaceSessionController,
  recordWorkspaceActionsController,
} from "../controllers/retro/workspace";
import { createRateLimit, joinRateLimit } from "../lib/rate-limit";
import { getRetroStub } from "../lib/retro-room-stub";
import { jsonError, notFoundResponse, rootResponse } from "../lib/response";

const RETRO_KEY_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const RETRO_KEY_LENGTH = 6;
const MAX_RETRO_KEY_ATTEMPTS = 5;

function generateRetroKey(): string {
  return secureRandomString(RETRO_KEY_ALPHABET, RETRO_KEY_LENGTH);
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
  const sessionToken = getRetroSessionToken(request, retroKey);

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

  const parsedBody = await readJsonBody<{
    name?: string;
    passcode?: string;
    settings?: Record<string, unknown>;
    templateId?: string;
    avatar?: string;
  }>(request);
  if (!parsedBody.ok) {
    return parsedBody.response as CfResponse;
  }
  const body = parsedBody.body;
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return jsonError("Name is required", 400);
  }

  const workspaceUserId = await resolveWorkspaceUserId(
    request,
    env.AUTH_WORKER,
  );

  for (let attempt = 0; attempt < MAX_RETRO_KEY_ATTEMPTS; attempt += 1) {
    const retroKey = generateRetroKey();
    const response = await getRetroStub(env, retroKey).fetch(
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

    if (response.status !== 409) {
      return response as CfResponse;
    }
  }

  return jsonError("Unable to allocate a retro code. Please try again.", 503);
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

  const parsedBody = await readJsonBody<{
    name?: string;
    retroKey?: string;
    passcode?: string;
    avatar?: string;
    authToken?: string;
  }>(request);
  if (!parsedBody.ok) {
    return parsedBody.response as CfResponse;
  }
  const body = parsedBody.body;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const retroKey =
    typeof body.retroKey === "string" ? body.retroKey.trim().toUpperCase() : "";
  const sessionToken =
    getRetroSessionToken(request, retroKey) ?? body.authToken;

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
  const sessionToken = getRetroSessionToken(request, retroKey);

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
