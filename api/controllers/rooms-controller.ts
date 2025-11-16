import type {
  Request as CfRequest,
  Response as CfResponse,
} from '@cloudflare/workers-types';

import type { Env, RoomSettings } from '../types';
import { generateRoomKey } from '../utils/room';
import { getRoomStub, jsonError } from '../utils/controller-helpers';

export async function createRoomController(
  request: CfRequest,
  env: Env
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
    return jsonError('Name is required');
  }

  const roomKey = generateRoomKey();
  const roomObject = getRoomStub(env, roomKey);

  return roomObject.fetch(
    new Request('https://dummy/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomKey,
        moderator: name,
        passcode,
        settings,
        avatar,
      }),
    }) as unknown as CfRequest
  );
}

export async function joinRoomController(
  request: CfRequest,
  env: Env
): Promise<CfResponse> {
  const body = await request.json<{
    name?: string;
    roomKey?: string;
    passcode?: string;
    avatar?: string;
  }>();
  const name = body?.name;
  const roomKey = body?.roomKey;
  const passcode = body?.passcode;
  const avatar = body?.avatar;

  if (!name || !roomKey) {
    return jsonError('Name and room key are required');
  }

  const roomObject = getRoomStub(env, roomKey);

  return roomObject.fetch(
    new Request('https://dummy/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, passcode, avatar }),
    }) as unknown as CfRequest
  );
}

export async function getRoomSettingsController(
  url: URL,
  env: Env
): Promise<CfResponse> {
  const roomKey = url.searchParams.get('roomKey');

  if (!roomKey) {
    return jsonError('Room key is required');
  }

  const roomObject = getRoomStub(env, roomKey);

  return roomObject.fetch(
    new Request('https://dummy/settings', {
      method: 'GET',
    }) as unknown as CfRequest
  );
}

export async function updateRoomSettingsController(
  request: CfRequest,
  env: Env
): Promise<CfResponse> {
  const body = await request.json<{
    name?: string;
    roomKey?: string;
    settings?: Record<string, unknown>;
  }>();

  const name = body?.name;
  const roomKey = body?.roomKey;
  const settings = body?.settings;

  if (!name || !roomKey || !settings) {
    return jsonError('Name, room key, and settings are required');
  }

  const roomObject = getRoomStub(env, roomKey);

  return roomObject.fetch(
    new Request('https://dummy/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, settings }),
    }) as unknown as CfRequest
  );
}
