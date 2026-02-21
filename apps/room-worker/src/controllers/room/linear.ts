import { createJsonResponse, getRoomSessionToken } from "@sprintjam/utils";

import type { CfResponse, PlanningRoomHttpContext } from "./types";

export async function handleLinearSaveCredentials(
  ctx: PlanningRoomHttpContext,
  request: Request,
): Promise<CfResponse> {
  const credentials = (await request.json()) as {
    accessToken: string;
    refreshToken: string | null;
    tokenType: string;
    expiresAt: number;
    scope: string | null;
    linearOrganizationId: string | null;
    linearUserId: string | null;
    linearUserEmail: string | null;
    authorizedBy: string;
    estimateField?: string | null;
  };

  const roomData = await ctx.getRoomData();
  if (!roomData || !roomData.key) {
    return createJsonResponse({ error: "Room not found" }, 404);
  }

  await ctx.repository.saveLinearOAuthCredentials({
    roomKey: roomData.key,
    accessToken: credentials.accessToken,
    refreshToken: credentials.refreshToken,
    tokenType: credentials.tokenType,
    expiresAt: credentials.expiresAt,
    scope: credentials.scope,
    linearOrganizationId: credentials.linearOrganizationId,
    linearUserId: credentials.linearUserId,
    linearUserEmail: credentials.linearUserEmail,
    estimateField: credentials.estimateField ?? null,
    authorizedBy: credentials.authorizedBy,
  });

  ctx.broadcast({
    type: "linearConnected",
    linearOrganizationId: credentials.linearOrganizationId,
  });

  return createJsonResponse({ success: true });
}

export async function handleLinearStatus(
  ctx: PlanningRoomHttpContext,
  request: Request,
): Promise<CfResponse> {
  const { roomKey, userName } = (await request.json().catch(() => ({}))) as {
    roomKey?: string;
    userName?: string;
  };

  const roomData = await ctx.getRoomData();
  if (!roomData || !roomData.key) {
    return createJsonResponse({ error: "Room not found" }, 404);
  }

  const sessionToken = getRoomSessionToken(request);

  if (!roomKey || !userName || !sessionToken) {
    return createJsonResponse(
      { error: "Missing room key, user name, or session token" },
      400,
    );
  }
  if (roomData.key !== roomKey) {
    return createJsonResponse({ error: "Room not found" }, 404);
  }
  const isMember = roomData.users.includes(userName);
  const tokenValid = ctx.repository.validateSessionToken(
    userName,
    sessionToken,
  );
  if (!isMember || !tokenValid) {
    return createJsonResponse({ error: "Invalid session" }, 401);
  }

  const credentials = await ctx.repository.getLinearOAuthCredentials(
    roomData.key,
  );

  if (!credentials) {
    return createJsonResponse({
      connected: false,
    });
  }

  return createJsonResponse({
    connected: true,
    linearOrganizationId: credentials.linearOrganizationId,
    linearUserEmail: credentials.linearUserEmail,
    expiresAt: credentials.expiresAt,
    estimateField: credentials.estimateField,
  });
}

export async function handleLinearCredentials(
  ctx: PlanningRoomHttpContext,
): Promise<CfResponse> {
  const roomData = await ctx.getRoomData();
  if (!roomData || !roomData.key) {
    return createJsonResponse({ error: "Room not found" }, 404);
  }

  const credentials = await ctx.repository.getLinearOAuthCredentials(
    roomData.key,
  );

  if (!credentials) {
    return createJsonResponse({ error: "Linear not connected" }, 404);
  }

  return createJsonResponse({ credentials });
}

export async function handleLinearRefresh(
  ctx: PlanningRoomHttpContext,
  request: Request,
): Promise<CfResponse> {
  const { accessToken, refreshToken, expiresAt } = (await request.json()) as {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };

  const roomData = await ctx.getRoomData();
  if (!roomData || !roomData.key) {
    return createJsonResponse({ error: "Room not found" }, 404);
  }

  await ctx.repository.updateLinearOAuthTokens(
    roomData.key,
    accessToken,
    refreshToken,
    expiresAt,
  );

  return createJsonResponse({ success: true });
}

export async function handleLinearRevoke(
  ctx: PlanningRoomHttpContext,
  request: Request,
): Promise<CfResponse> {
  const body = (await request.json().catch(() => ({}))) as {
    roomKey?: string;
    userName?: string;
  };

  const roomKey = body?.roomKey;
  const userName = body?.userName;

  const roomData = await ctx.getRoomData();
  if (!roomData || !roomData.key) {
    return createJsonResponse({ error: "Room not found" }, 404);
  }

  const sessionToken = getRoomSessionToken(request);

  if (!roomKey || !userName || !sessionToken) {
    return createJsonResponse(
      { error: "Missing room key, user name, or session token" },
      400,
    );
  }
  if (roomData.key !== roomKey) {
    return createJsonResponse({ error: "Room not found" }, 404);
  }
  const isMember = roomData.users.includes(userName);
  const tokenValid = ctx.repository.validateSessionToken(
    userName,
    sessionToken,
  );
  if (!isMember || !tokenValid) {
    return createJsonResponse({ error: "Invalid session" }, 401);
  }

  ctx.repository.deleteLinearOAuthCredentials(roomData.key);

  ctx.broadcast({ type: "linearDisconnected" });

  return createJsonResponse({ success: true });
}
