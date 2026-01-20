import type { WheelRoom } from '../../durable-objects/wheel-room';
import type { WheelData, WheelSettings } from '@sprintjam/types';
import { hashPasscode, verifyPasscode, generateID } from '@sprintjam/utils';
import { jsonResponse, jsonError } from '../../lib/response';

export interface WheelRoomHttpContext {
  repository: WheelRoom['repository'];
  getWheelData(): Promise<WheelData | undefined>;
  putWheelData(data: WheelData): Promise<void>;
  disconnectUserSessions(userName: string): void;
}

const DEFAULT_SETTINGS: WheelSettings = {
  removeWinnerAfterSpin: false,
  showConfetti: true,
  playSounds: true,
  spinDurationMs: 4000,
};

export async function handleHttpRequest(
  context: WheelRoomHttpContext,
  request: Request,
): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/initialize' && request.method === 'POST') {
    return handleInitialize(context, request);
  }

  if (path === '/join' && request.method === 'POST') {
    return handleJoin(context, request);
  }

  if (path === '/settings' && request.method === 'GET') {
    return handleGetSettings(context, request);
  }

  return null;
}

async function handleInitialize(
  context: WheelRoomHttpContext,
  request: Request,
): Promise<Response> {
  const body = await request.json<{
    wheelKey: string;
    moderator: string;
    passcode?: string;
    settings?: Partial<WheelSettings>;
    avatar?: string;
  }>();

  const { wheelKey, moderator, passcode, settings, avatar } = body;

  if (!wheelKey || !moderator) {
    return jsonError('Wheel key and moderator are required');
  }

  const existingWheel = await context.getWheelData();
  if (existingWheel) {
    return jsonError('Wheel already exists', 409);
  }

  const sessionToken = generateID();

  const wheelSettings: WheelSettings = {
    ...DEFAULT_SETTINGS,
    ...settings,
  };

  const wheelData: WheelData = {
    key: wheelKey,
    entries: [],
    moderator,
    users: [moderator],
    connectedUsers: { [moderator]: false },
    spinState: null,
    results: [],
    settings: wheelSettings,
    status: 'active',
    passcodeHash: passcode ? await hashPasscode(passcode) : undefined,
    userAvatars: avatar ? { [moderator]: avatar } : undefined,
  };

  await context.putWheelData(wheelData);
  context.repository.setSessionToken(moderator, sessionToken);
  if (avatar) {
    context.repository.setUserAvatar(moderator, avatar);
  }

  return new Response(
    JSON.stringify({
      success: true,
      wheel: wheelData,
    }),
    {
      status: 200,
      headers: {
        'Set-Cookie': `wheel_session=${sessionToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`,
      },
    },
  );
}

async function handleJoin(
  context: WheelRoomHttpContext,
  request: Request,
): Promise<Response> {
  const body = await request.json<{
    name: string;
    passcode?: string;
    avatar?: string;
  }>();

  const { name, passcode, avatar } = body;

  if (!name) {
    return jsonError('Name is required');
  }

  const wheelData = await context.getWheelData();
  if (!wheelData) {
    return jsonError('Wheel not found', 404);
  }

  if (wheelData.passcodeHash) {
    if (!passcode) {
      return jsonError('Passcode is required', 401);
    }

    const isValid = await verifyPasscode(passcode, wheelData.passcodeHash);
    if (!isValid) {
      return jsonError('Invalid passcode', 401);
    }
  }

  const existingUser = wheelData.users.find(
    (u) => u.toLowerCase() === name.toLowerCase(),
  );

  if (existingUser && wheelData.connectedUsers[existingUser]) {
    context.disconnectUserSessions(existingUser);
  }

  const canonicalName = context.repository.ensureUser(name);
  const sessionToken = generateID();
  context.repository.setSessionToken(canonicalName, sessionToken);

  if (avatar) {
    context.repository.setUserAvatar(canonicalName, avatar);
  }

  const freshWheel = await context.getWheelData();

  return new Response(
    JSON.stringify({
      success: true,
      wheel: freshWheel,
    }),
    {
      status: 200,
      headers: {
        'Set-Cookie': `wheel_session=${sessionToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`,
      },
    },
  );
}

async function handleGetSettings(
  context: WheelRoomHttpContext,
  request: Request,
): Promise<Response> {
  const url = new URL(request.url);
  const name = url.searchParams.get('name');

  const wheelData = await context.getWheelData();
  if (!wheelData) {
    return jsonError('Wheel not found', 404);
  }

  return jsonResponse({
    settings: wheelData.settings,
    moderator: wheelData.moderator,
    isModerator: name ? wheelData.moderator === name : false,
  });
}
