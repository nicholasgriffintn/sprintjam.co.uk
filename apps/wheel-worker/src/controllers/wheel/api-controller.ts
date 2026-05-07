import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { WheelWorkerEnv } from "@sprintjam/types";
import {
  getWheelSessionToken,
  checkBotProtection,
  validateRequestBodySize,
  resolveWorkspaceUserId,
} from "@sprintjam/utils";

import { jsonError, notFoundResponse } from "../../lib/response";
import { createRateLimit, joinRateLimit } from "../../lib/rate-limit";
import {
  getWheelStub,
  validateWheelSessionForKey,
} from "./session-validation";
import {
  createWorkspaceSessionController,
  recordSessionStatsController,
  recordWorkspaceOutcomeController,
} from "./workspace";

export async function handleWheelWebSocket(
  request: CfRequest,
  env: WheelWorkerEnv,
): Promise<CfResponse> {
  if (request.headers.get("Upgrade") !== "websocket") {
    return jsonError("Expected WebSocket", 400);
  }

  const url = new URL(request.url);
  const wheelKey = url.searchParams.get("wheel");
  const userName = url.searchParams.get("name");
  const sessionToken = getWheelSessionToken(request);

  if (!wheelKey || !userName || !sessionToken) {
    return jsonError("Missing wheel key, user name, or session token", 400);
  }

  const wheelStub = getWheelStub(env, wheelKey);
  return wheelStub.fetch(request);
}

function generateWheelKey(): string {
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .substring(0, 6)
    .toUpperCase();
}

async function createWheelController(
  request: CfRequest,
  env: WheelWorkerEnv,
): Promise<CfResponse> {
  const botCheck = checkBotProtection(
    request,
    env.ENABLE_WHEEL_RATE_LIMIT === "true",
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
    settings?: Record<string, unknown>;
    avatar?: string;
  }>();

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const passcode = body?.passcode;
  const settings =
    body?.settings &&
    typeof body.settings === "object" &&
    !Array.isArray(body.settings)
      ? body.settings
      : undefined;
  const avatar = body?.avatar;

  if (!name) {
    return jsonError("Name is required");
  }

  const workspaceUserId = await resolveWorkspaceUserId(
    request,
    env.AUTH_WORKER,
  );
  const wheelKey = generateWheelKey();
  const wheelObject = getWheelStub(env, wheelKey);

  return wheelObject.fetch(
    new Request("https://internal/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wheelKey,
        moderator: name,
        passcode,
        settings,
        avatar,
        workspaceUserId,
      }),
    }) as unknown as CfRequest,
  );
}

async function joinWheelController(
  request: CfRequest,
  env: WheelWorkerEnv,
): Promise<CfResponse> {
  const botCheck = checkBotProtection(
    request,
    env.ENABLE_WHEEL_RATE_LIMIT === "true",
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
    wheelKey?: string;
    passcode?: string;
    avatar?: string;
    authToken?: string;
  }>();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const wheelKey =
    typeof body?.wheelKey === "string"
      ? body.wheelKey.trim().toUpperCase()
      : "";
  const passcode = body?.passcode;
  const avatar = body?.avatar;
  const authToken = body?.authToken;
  const sessionToken = getWheelSessionToken(request) ?? authToken;

  if (!name || !wheelKey) {
    return jsonError("Name and wheel key are required");
  }

  const workspaceUserId = await resolveWorkspaceUserId(
    request,
    env.AUTH_WORKER,
  );
  const wheelObject = getWheelStub(env, wheelKey);

  return wheelObject.fetch(
    new Request("https://internal/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sessionToken ? { Cookie: `wheel_session=${sessionToken}` } : {}),
      },
      body: JSON.stringify({
        name,
        passcode,
        avatar,
        authToken,
        workspaceUserId,
      }),
    }) as unknown as CfRequest,
  );
}

async function getWheelSettingsController(
  request: CfRequest,
  env: WheelWorkerEnv,
): Promise<CfResponse> {
  const url = new URL(request.url);
  const wheelKey = url.searchParams.get("wheelKey");
  const name = url.searchParams.get("name");
  const sessionToken = getWheelSessionToken(request);

  if (!wheelKey) {
    return jsonError("Wheel key is required");
  }

  const wheelObject = getWheelStub(env, wheelKey);
  const doUrl = new URL("https://internal/settings");
  if (name) {
    doUrl.searchParams.set("name", name);
  }

  return wheelObject.fetch(
    new Request(doUrl.toString(), {
      method: "GET",
      headers: {
        ...(sessionToken ? { Cookie: `wheel_session=${sessionToken}` } : {}),
      },
    }) as unknown as CfRequest,
  );
}

async function recoverWheelController(
  request: CfRequest,
  env: WheelWorkerEnv,
): Promise<CfResponse> {
  const sizeCheck = validateRequestBodySize(request);
  if (!sizeCheck.ok) {
    return sizeCheck.response as CfResponse;
  }

  const body = await request.json<{
    name?: string;
    wheelKey?: string;
    recoveryPasskey?: string;
  }>();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const wheelKey =
    typeof body?.wheelKey === "string"
      ? body.wheelKey.trim().toUpperCase()
      : "";
  const recoveryPasskey = body?.recoveryPasskey;

  if (!name || !wheelKey || !recoveryPasskey) {
    return jsonError("Name, wheel key, and recovery passkey are required");
  }

  const wheelObject = getWheelStub(env, wheelKey);

  return wheelObject.fetch(
    new Request("https://internal/recover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, recoveryPasskey }),
    }) as unknown as CfRequest,
  );
}

async function validateWheelSessionController(
  request: CfRequest,
  env: WheelWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<{ wheelKey?: string }>();
  const wheelKey =
    typeof body?.wheelKey === "string"
      ? body.wheelKey.trim().toUpperCase()
      : "";

  if (!wheelKey) {
    return jsonError("Wheel key is required");
  }

  const validationError = await validateWheelSessionForKey(
    request,
    env,
    wheelKey,
  );

  return (
    validationError ??
    new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );
}

async function updateWheelPasscodeController(
  request: CfRequest,
  env: WheelWorkerEnv,
): Promise<CfResponse> {
  const url = new URL(request.url);
  const wheelKey = url.pathname.match(/wheels\/([^/]+)\/passcode/)?.[1];
  const sessionToken = getWheelSessionToken(request);

  if (!wheelKey) {
    return jsonError("Wheel key is required");
  }

  const sizeCheck = validateRequestBodySize(request);
  if (!sizeCheck.ok) {
    return sizeCheck.response as CfResponse;
  }

  const wheelObject = getWheelStub(env, wheelKey);

  return wheelObject.fetch(
    new Request("https://internal/passcode", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(sessionToken ? { Cookie: `wheel_session=${sessionToken}` } : {}),
      },
      body: request.body,
    }) as unknown as CfRequest,
  );
}

export async function handleWheelApiRoute(
  request: CfRequest,
  env: WheelWorkerEnv,
  path: string,
): Promise<CfResponse> {
  const method = request.method;

  if (path === "wheels" && method === "POST") {
    return createWheelController(request, env);
  }

  if (path === "wheels/join" && method === "POST") {
    return joinWheelController(request, env);
  }

  if (path === "wheels/recover" && method === "POST") {
    return recoverWheelController(request, env);
  }

  if (path === "wheels/session/validate" && method === "POST") {
    return validateWheelSessionController(request, env);
  }

  if (path === "wheels/workspace-sessions" && method === "POST") {
    return createWorkspaceSessionController(request, env);
  }

  if (path === "wheels/workspace-outcomes" && method === "POST") {
    return recordWorkspaceOutcomeController(request, env);
  }

  if (path === "wheels/session-stats" && method === "POST") {
    return recordSessionStatsController(request, env);
  }

  if (path === "wheels/settings" && method === "GET") {
    return getWheelSettingsController(request, env);
  }

  if (path.match(/^wheels\/[^/]+\/passcode$/) && method === "PUT") {
    return updateWheelPasscodeController(request, env);
  }

  return notFoundResponse("API");
}
