import {
  getServerDefaults,
  createJsonResponse,
  generateSessionToken,
  generateRecoveryPasskey,
  verifyPasscode,
  createRoomSessionCookie,
  getRoomSessionToken,
  SESSION_TOKEN_TTL_MS,
} from "@sprintjam/utils";
import type { Request as CfRequest } from "@cloudflare/workers-types";

import type { CfResponse, PlanningRoomHttpContext } from "./types";
import {
  assignUserAvatar,
  findCanonicalUserName,
  markUserConnection,
  normalizeRoomData,
  sanitizeRoomData,
} from "../../lib/room-data";

export async function handleJoin(
  ctx: PlanningRoomHttpContext,
  request: Request,
): Promise<CfResponse> {
  const { name, passcode, avatar, workspaceUserId } =
    (await request.json()) as {
      name: string;
      passcode?: string;
      avatar?: string;
      workspaceUserId?: number;
    };

  const authToken = getRoomSessionToken(request as unknown as CfRequest);

  const roomData = await ctx.getRoomData();

  if (!roomData || !roomData.key) {
    return createJsonResponse({ error: "Room not found" }, 404);
  }

  const normalizedRoomData = normalizeRoomData(roomData);

  // For logged-in workspace users, find their existing slot by user ID first.
  // This lets them rejoin without a session token or recovery passkey.
  let canonicalName: string | undefined;
  if (workspaceUserId) {
    canonicalName = ctx.repository.findUserNameByWorkspaceId(workspaceUserId);
  }

  const isWorkspaceUserRejoining = !!canonicalName;

  if (!canonicalName) {
    canonicalName =
      findCanonicalUserName(normalizedRoomData, name) ?? name.trim();
  }

  const isConnected = !!normalizedRoomData.connectedUsers?.[canonicalName];
  const storedPasscodeHash = ctx.repository.getPasscodeHash();
  const hasValidSessionToken = ctx.repository.validateSessionToken(
    canonicalName,
    authToken ?? null,
  );

  if (
    storedPasscodeHash &&
    !hasValidSessionToken &&
    !isWorkspaceUserRejoining
  ) {
    let isValidPasscode = false;
    if (passcode) {
      try {
        isValidPasscode = await verifyPasscode(passcode, storedPasscodeHash);
      } catch {
        return createJsonResponse({ error: "Invalid passcode" }, 400);
      }
    }

    if (!isValidPasscode) {
      return createJsonResponse({ error: "Invalid passcode" }, 401);
    }
  }

  // Block name conflicts only when the user has no existing slot by workspace ID
  // and no valid session token.
  if (isConnected && !hasValidSessionToken && !isWorkspaceUserRejoining) {
    return createJsonResponse(
      { error: "User with this name is already connected" },
      409,
    );
  }

  const updatedRoomData = normalizedRoomData;
  markUserConnection(updatedRoomData, canonicalName, true);
  assignUserAvatar(updatedRoomData, canonicalName, avatar);

  ctx.repository.ensureUser(canonicalName);
  ctx.repository.setUserConnection(canonicalName, true);
  ctx.repository.setUserAvatar(canonicalName, avatar);

  if (workspaceUserId) {
    ctx.repository.setWorkspaceUserId(canonicalName, workspaceUserId);
  }

  ctx.broadcast({
    type: "userJoined",
    user: canonicalName,
    avatar,
  });

  const newAuthToken = generateSessionToken();
  ctx.repository.setSessionToken(canonicalName, newAuthToken);
  ctx.disconnectUserSessions?.(canonicalName);

  // Only generate a recovery passkey for anonymous users — workspace users
  // authenticate via their workspace session instead.
  let recoveryPasskey: string | undefined;
  if (!workspaceUserId) {
    recoveryPasskey = generateRecoveryPasskey();
    await ctx.repository.setRecoveryPasskey(canonicalName, recoveryPasskey);
  }

  const defaults = getServerDefaults();

  const maxAgeSeconds = Math.floor(SESSION_TOKEN_TTL_MS / 1000);
  const cookie = createRoomSessionCookie(
    newAuthToken,
    maxAgeSeconds,
    true,
    roomData.key,
  );

  return new Response(
    JSON.stringify({
      success: true,
      room: sanitizeRoomData(updatedRoomData),
      defaults,
      recoveryPasskey,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookie,
      },
    },
  ) as unknown as CfResponse;
}
