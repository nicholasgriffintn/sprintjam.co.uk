import {
  createJsonResponse,
  generateSessionToken,
  createRoomSessionCookie,
  SESSION_TOKEN_TTL_MS,
} from "@sprintjam/utils";

import type { CfResponse, PlanningRoomHttpContext } from "./types";
import { findCanonicalUserName, normalizeRoomData } from "../../lib/room-data";

export async function handleRecover(
  ctx: PlanningRoomHttpContext,
  request: Request,
): Promise<CfResponse> {
  const { name, recoveryPasskey } = (await request.json()) as {
    name: string;
    recoveryPasskey: string;
  };

  if (!name || !recoveryPasskey) {
    return createJsonResponse(
      { error: "Name and recovery passkey are required" },
      400,
    ) as unknown as CfResponse;
  }

  const roomData = await ctx.getRoomData();
  if (!roomData?.key) {
    return createJsonResponse(
      { error: "Room not found" },
      404,
    ) as unknown as CfResponse;
  }

  const normalizedRoomData = normalizeRoomData(roomData);
  const canonicalName = findCanonicalUserName(normalizedRoomData, name);
  if (!canonicalName) {
    return createJsonResponse(
      { error: "Invalid name or recovery passkey" },
      401,
    ) as unknown as CfResponse;
  }

  const isValid = await ctx.repository.validateRecoveryPasskey(
    canonicalName,
    recoveryPasskey,
  );
  if (!isValid) {
    return createJsonResponse(
      { error: "Invalid name or recovery passkey" },
      401,
    ) as unknown as CfResponse;
  }

  const newAuthToken = generateSessionToken();
  ctx.repository.setSessionToken(canonicalName, newAuthToken);

  if (normalizedRoomData.connectedUsers?.[canonicalName]) {
    ctx.disconnectUserSessions?.(canonicalName);
  }

  const maxAgeSeconds = Math.floor(SESSION_TOKEN_TTL_MS / 1000);
  const cookie = createRoomSessionCookie(
    newAuthToken,
    maxAgeSeconds,
    true,
    roomData.key,
  );

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookie,
    },
  }) as unknown as CfResponse;
}
