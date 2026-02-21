import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { RoomWorkerEnv, RoomSettings } from "@sprintjam/types";

import {
  generateRoomKey,
  getRoomSessionToken,
  getRoomStub,
} from "@sprintjam/utils";
import { jsonError } from "../../lib/response";

export async function createRoomController(
  request: CfRequest,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<{
    name?: string;
    passcode?: string;
    settings?: Partial<RoomSettings>;
    avatar?: string;
  }>();

  const name = body?.name;
  const passcode = body?.passcode;
  const settings = body?.settings;
  const avatar = body?.avatar;

  if (!name) {
    return jsonError("Name is required");
  }

  const key = name
    ? `${name}-${request.headers.get("cf-connecting-ip") ?? "unknown"}`
    : (request.headers.get("cf-connecting-ip") ?? "unknown");

  if (env.ENABLE_JOIN_RATE_LIMIT === "true") {
    if (!env.JOIN_RATE_LIMITER) {
      console.error(
        "Rate limiters are not configured but rate limiting is enabled",
      );
      return jsonError("Service temporarily unavailable", 503);
    }

    const { success: rateLimitSuccess } = await env.JOIN_RATE_LIMITER.limit({
      key,
    });

    if (!rateLimitSuccess) {
      return jsonError("Rate limit exceeded", 429);
    }
  }

  const roomKey = generateRoomKey();
  const roomObject = getRoomStub(env, roomKey);

  return roomObject.fetch(
    new Request("https://internal/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomKey,
        moderator: name,
        passcode,
        settings,
        avatar,
      }),
    }) as unknown as CfRequest,
  );
}

export async function joinRoomController(
  request: CfRequest,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<{
    name?: string;
    roomKey?: string;
    passcode?: string;
    avatar?: string;
    authToken?: string;
  }>();
  const name = body?.name;
  const roomKey = body?.roomKey;
  const passcode = body?.passcode;
  const avatar = body?.avatar;
  const authToken = body?.authToken;
  const sessionToken = getRoomSessionToken(request) ?? authToken;

  if (!name || !roomKey) {
    return jsonError("Name and room key are required");
  }

  const roomObject = getRoomStub(env, roomKey);

  return roomObject.fetch(
    new Request("https://internal/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sessionToken ? { Cookie: `room_session=${sessionToken}` } : {}),
      },
      body: JSON.stringify({ name, passcode, avatar, authToken }),
    }) as unknown as CfRequest,
  );
}

export async function getRoomSettingsController(
  request: CfRequest,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const url = new URL(request.url);
  const roomKey = url.searchParams.get("roomKey");
  const name = url.searchParams.get("name");
  const sessionToken = getRoomSessionToken(request);

  if (!roomKey) {
    return jsonError("Room key is required");
  }

  const roomObject = getRoomStub(env, roomKey);
  const doUrl = new URL("https://internal/settings");
  if (name) {
    doUrl.searchParams.set("name", name);
  }

  return roomObject.fetch(
    new Request(doUrl.toString(), {
      method: "GET",
      headers: {
        ...(sessionToken ? { Cookie: `room_session=${sessionToken}` } : {}),
      },
    }) as unknown as CfRequest,
  );
}

export async function updateRoomSettingsController(
  request: CfRequest,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<{
    name?: string;
    roomKey?: string;
    settings?: Record<string, unknown>;
  }>();

  const name = body?.name;
  const roomKey = body?.roomKey;
  const settings = body?.settings;

  const sessionToken = getRoomSessionToken(request);

  if (!name || !roomKey || !settings) {
    return jsonError("Name, room key, and settings are required");
  }

  const roomObject = getRoomStub(env, roomKey);

  return roomObject.fetch(
    new Request("https://internal/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, settings, sessionToken }),
    }) as unknown as CfRequest,
  );
}
