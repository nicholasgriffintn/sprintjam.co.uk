import {
  createJsonResponse,
  applySettingsUpdate,
  getRoomSessionToken,
} from '@sprintjam/utils';
import type { RoomData } from '@sprintjam/types';
import type { Request as CfRequest } from '@cloudflare/workers-types';

import type { CfResponse, PlanningRoomHttpContext } from './types';

export async function handleGetSettings(
  ctx: PlanningRoomHttpContext,
  request: Request
): Promise<CfResponse> {
  const roomData = await ctx.getRoomData();

  if (!roomData || !roomData.key) {
    return createJsonResponse({ error: 'Room not found' }, 404);
  }

  const url = new URL(request.url);
  const sessionToken = getRoomSessionToken(request as unknown as CfRequest);
  const name = url.searchParams.get('name');

  if (!name || !sessionToken) {
    return createJsonResponse({ error: 'Missing name or session token' }, 401);
  }

  const isMember = roomData.users.includes(name);
  const tokenValid = ctx.repository.validateSessionToken(name, sessionToken);

  if (!isMember || !tokenValid) {
    return createJsonResponse({ error: 'Invalid session' }, 401);
  }

  return createJsonResponse({
    success: true,
    settings: roomData.settings,
  });
}

export async function handleUpdateSettings(
  ctx: PlanningRoomHttpContext,
  request: Request
): Promise<CfResponse> {
  const { name, settings, sessionToken } = (await request.json()) as {
    name: string;
    settings: RoomData['settings'];
    sessionToken?: string;
  };

  const roomData = await ctx.getRoomData();

  if (!roomData || !roomData.key) {
    return createJsonResponse({ error: 'Room not found' }, 404);
  }

  if (!sessionToken) {
    return createJsonResponse({ error: 'Missing session token' }, 401);
  }

  const tokenValid = ctx.repository.validateSessionToken(name, sessionToken);

  if (!tokenValid) {
    return createJsonResponse({ error: 'Invalid session' }, 401);
  }

  if (roomData.moderator !== name) {
    return createJsonResponse(
      { error: 'Only the moderator can update settings' },
      403
    );
  }

  const providedSettings = settings as Partial<RoomData['settings']>;
  roomData.settings = applySettingsUpdate({
    currentSettings: roomData.settings,
    settingsUpdate: providedSettings,
  });

  ctx.repository.setSettings(roomData.settings);

  ctx.broadcast({
    type: 'settingsUpdated',
    settings: roomData.settings,
  });

  return createJsonResponse({
    success: true,
    settings: roomData.settings,
  });
}
