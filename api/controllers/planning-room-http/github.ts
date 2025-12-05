import { createJsonResponse } from '../../utils/http';

import type { CfResponse, PlanningRoomHttpContext } from './types';

export async function handleGithubSaveCredentials(
  ctx: PlanningRoomHttpContext,
  request: Request
): Promise<CfResponse> {
  const credentials = (await request.json()) as {
    accessToken: string;
    refreshToken?: string | null;
    tokenType: string;
    expiresAt?: number;
    scope: string | null;
    githubLogin?: string | null;
    githubUserEmail?: string | null;
    defaultOwner?: string | null;
    defaultRepo?: string | null;
    authorizedBy: string;
  };

  const roomData = await ctx.getRoomData();
  if (!roomData || !roomData.key) {
    return createJsonResponse({ error: 'Room not found' }, 404);
  }

  ctx.repository.saveGithubOAuthCredentials({
    roomKey: roomData.key,
    accessToken: credentials.accessToken,
    refreshToken: credentials.refreshToken ?? null,
    tokenType: credentials.tokenType,
    expiresAt:
      credentials.expiresAt ??
      Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days by default
    scope: credentials.scope,
    githubLogin: credentials.githubLogin ?? null,
    githubUserEmail: credentials.githubUserEmail ?? null,
    defaultOwner: credentials.defaultOwner ?? null,
    defaultRepo: credentials.defaultRepo ?? null,
    authorizedBy: credentials.authorizedBy,
  });

  ctx.broadcast({
    type: 'githubConnected',
    githubLogin: credentials.githubLogin ?? '',
  });

  return createJsonResponse({ success: true });
}

export async function handleGithubStatus(
  ctx: PlanningRoomHttpContext,
  url: URL
): Promise<CfResponse> {
  const roomKey = url.searchParams.get('roomKey');
  const userName = url.searchParams.get('userName');
  const sessionToken = url.searchParams.get('sessionToken');

  const roomData = await ctx.getRoomData();
  if (!roomData || !roomData.key) {
    return createJsonResponse({ error: 'Room not found' }, 404);
  }

  if (!roomKey || !userName || !sessionToken) {
    return createJsonResponse(
      { error: 'Missing room key, user name, or session token' },
      400
    );
  }

  if (roomData.key !== roomKey) {
    return createJsonResponse({ error: 'Room not found' }, 404);
  }

  const isMember = roomData.users.includes(userName);
  const tokenValid = ctx.repository.validateSessionToken(userName, sessionToken);
  if (!isMember || !tokenValid) {
    return createJsonResponse({ error: 'Invalid session' }, 401);
  }

  const credentials = ctx.repository.getGithubOAuthCredentials(roomData.key);

  if (!credentials) {
    return createJsonResponse({ connected: false });
  }

  return createJsonResponse({
    connected: true,
    githubLogin: credentials.githubLogin,
    githubUserEmail: credentials.githubUserEmail,
    defaultOwner: credentials.defaultOwner,
    defaultRepo: credentials.defaultRepo,
    expiresAt: credentials.expiresAt,
  });
}

export async function handleGithubCredentials(
  ctx: PlanningRoomHttpContext
): Promise<CfResponse> {
  const roomData = await ctx.getRoomData();
  if (!roomData || !roomData.key) {
    return createJsonResponse({ error: 'Room not found' }, 404);
  }

  const credentials = ctx.repository.getGithubOAuthCredentials(roomData.key);

  if (!credentials) {
    return createJsonResponse({ error: 'GitHub not connected' }, 404);
  }

  return createJsonResponse({ credentials });
}

export async function handleGithubRevoke(
  ctx: PlanningRoomHttpContext,
  request: Request
): Promise<CfResponse> {
  const body = (await request.json().catch(() => ({}))) as {
    roomKey?: string;
    userName?: string;
    sessionToken?: string;
  };

  const roomKey = body?.roomKey;
  const userName = body?.userName;
  const sessionToken = body?.sessionToken;

  const roomData = await ctx.getRoomData();
  if (!roomData || !roomData.key) {
    return createJsonResponse({ error: 'Room not found' }, 404);
  }

  if (!roomKey || !userName || !sessionToken) {
    return createJsonResponse(
      { error: 'Missing room key, user name, or session token' },
      400
    );
  }

  if (roomData.key !== roomKey) {
    return createJsonResponse({ error: 'Room not found' }, 404);
  }

  const isMember = roomData.users.includes(userName);
  const tokenValid = ctx.repository.validateSessionToken(userName, sessionToken);
  if (!isMember || !tokenValid) {
    return createJsonResponse({ error: 'Invalid session' }, 401);
  }

  ctx.repository.deleteGithubOAuthCredentials(roomData.key);
  ctx.broadcast({ type: 'githubDisconnected' });

  return createJsonResponse({ success: true });
}
