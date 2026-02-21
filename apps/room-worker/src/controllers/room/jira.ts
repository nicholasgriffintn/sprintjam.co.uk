import { createJsonResponse, getRoomSessionToken } from "@sprintjam/utils";

import type { CfResponse, PlanningRoomHttpContext } from "./types";

export async function handleJiraSaveCredentials(
  ctx: PlanningRoomHttpContext,
  request: Request,
): Promise<CfResponse> {
  const credentials = (await request.json()) as {
    accessToken: string;
    refreshToken: string | null;
    tokenType: string;
    expiresAt: number;
    scope: string | null;
    jiraDomain: string;
    jiraCloudId: string | null;
    jiraUserId: string | null;
    jiraUserEmail: string | null;
    authorizedBy: string;
    storyPointsField?: string | null;
    sprintField?: string | null;
  };

  const roomData = await ctx.getRoomData();
  if (!roomData || !roomData.key) {
    return createJsonResponse({ error: "Room not found" }, 404);
  }

  await ctx.repository.saveJiraOAuthCredentials({
    roomKey: roomData.key,
    accessToken: credentials.accessToken,
    refreshToken: credentials.refreshToken,
    tokenType: credentials.tokenType,
    expiresAt: credentials.expiresAt,
    scope: credentials.scope,
    jiraDomain: credentials.jiraDomain,
    jiraCloudId: credentials.jiraCloudId,
    jiraUserId: credentials.jiraUserId,
    jiraUserEmail: credentials.jiraUserEmail,
    storyPointsField: credentials.storyPointsField ?? null,
    sprintField: credentials.sprintField ?? null,
    authorizedBy: credentials.authorizedBy,
  });

  ctx.broadcast({
    type: "jiraConnected",
    jiraDomain: credentials.jiraDomain,
  });

  return createJsonResponse({ success: true });
}

export async function handleJiraStatus(
  ctx: PlanningRoomHttpContext,
  request: Request,
): Promise<CfResponse> {
  const { roomKey, userName } = (await request.json().catch(() => ({}))) as {
    roomKey?: string;
    userName?: string;
  };

  const sessionToken = getRoomSessionToken(request);

  const roomData = await ctx.getRoomData();
  if (!roomData || !roomData.key) {
    return createJsonResponse({ error: "Room not found" }, 404);
  }

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

  const credentials = await ctx.repository.getJiraOAuthCredentials(
    roomData.key,
  );

  if (!credentials) {
    return createJsonResponse({
      connected: false,
    });
  }

  return createJsonResponse({
    connected: true,
    jiraDomain: credentials.jiraDomain,
    jiraUserEmail: credentials.jiraUserEmail,
    expiresAt: credentials.expiresAt,
    storyPointsField: credentials.storyPointsField,
    sprintField: credentials.sprintField,
  });
}

export async function handleJiraCredentials(
  ctx: PlanningRoomHttpContext,
): Promise<CfResponse> {
  const roomData = await ctx.getRoomData();
  if (!roomData || !roomData.key) {
    return createJsonResponse({ error: "Room not found" }, 404);
  }

  const credentials = await ctx.repository.getJiraOAuthCredentials(
    roomData.key,
  );

  if (!credentials) {
    return createJsonResponse({ error: "Jira not connected" }, 404);
  }

  return createJsonResponse({ credentials });
}

export async function handleJiraRefresh(
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

  await ctx.repository.updateJiraOAuthTokens(
    roomData.key,
    accessToken,
    refreshToken,
    expiresAt,
  );

  return createJsonResponse({ success: true });
}

export async function handleJiraUpdateFields(
  ctx: PlanningRoomHttpContext,
  request: Request,
): Promise<CfResponse> {
  const { storyPointsField, sprintField } = (await request.json()) as {
    storyPointsField?: string | null;
    sprintField?: string | null;
  };

  const roomData = await ctx.getRoomData();
  if (!roomData || !roomData.key) {
    return createJsonResponse({ error: "Room not found" }, 404);
  }

  const existing = await ctx.repository.getJiraOAuthCredentials(roomData.key);

  if (!existing) {
    return createJsonResponse(
      { error: "Jira not connected. Please connect first." },
      400,
    );
  }

  await ctx.repository.saveJiraOAuthCredentials({
    roomKey: roomData.key,
    accessToken: existing.accessToken,
    refreshToken: existing.refreshToken,
    tokenType: existing.tokenType,
    expiresAt: existing.expiresAt,
    scope: existing.scope,
    jiraDomain: existing.jiraDomain,
    jiraCloudId: existing.jiraCloudId,
    jiraUserId: existing.jiraUserId,
    jiraUserEmail: existing.jiraUserEmail,
    storyPointsField:
      storyPointsField === undefined
        ? existing.storyPointsField
        : storyPointsField,
    sprintField: sprintField === undefined ? existing.sprintField : sprintField,
    authorizedBy: existing.authorizedBy,
  });

  ctx.broadcast({
    type: "jiraConnected",
    jiraDomain: existing.jiraDomain,
  });

  return createJsonResponse({ success: true });
}

export async function handleJiraRevoke(
  ctx: PlanningRoomHttpContext,
  request: Request,
): Promise<CfResponse> {
  const body = (await request.json().catch(() => ({}))) as {
    roomKey?: string;
    userName?: string;
  };

  const roomKey = body?.roomKey;
  const userName = body?.userName;

  const sessionToken = getRoomSessionToken(request);

  const roomData = await ctx.getRoomData();
  if (!roomData || !roomData.key) {
    return createJsonResponse({ error: "Room not found" }, 404);
  }

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

  ctx.repository.deleteJiraOAuthCredentials(roomData.key);

  ctx.broadcast({ type: "jiraDisconnected" });

  return createJsonResponse({ success: true });
}
