import type { RoomSettings } from '@sprintjam/types';
import {
  createInitialRoomData,
  getServerDefaults,
  assignUserAvatar,
  sanitizeRoomData,
  createJsonResponse,
  generateSessionToken,
  hashPasscode,
  createRoomSessionCookie,
  SESSION_TOKEN_TTL_MS,
} from '@sprintjam/utils';

import type { CfResponse, PlanningRoomHttpContext } from './types';

export async function handleInitialize(
  ctx: PlanningRoomHttpContext,
  request: Request,
): Promise<CfResponse> {
  const { roomKey, moderator, passcode, settings, avatar } =
    (await request.json()) as {
      roomKey: string;
      moderator: string;
      passcode?: string;
      settings?: Partial<RoomSettings>;
      avatar?: string;
    };

  let passcodeHash;
  if (passcode) {
    try {
      passcodeHash = await hashPasscode(passcode);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Invalid passcode provided';
      return createJsonResponse({ error: message }, 400);
    }
  }

  const roomData = await ctx.getRoomData();

  if (roomData?.key) {
    return createJsonResponse({ error: 'Room already exists' }, 400);
  }

  const newRoomData = createInitialRoomData({
    key: roomKey,
    users: [moderator],
    moderator,
    connectedUsers: { [moderator]: true },
    passcodeHash,
    settings,
  });

  assignUserAvatar(newRoomData, moderator, avatar);

  await ctx.putRoomData(newRoomData);

  const authToken = generateSessionToken();
  ctx.repository.setSessionToken(moderator, authToken);

  const defaults = getServerDefaults();

  const maxAgeSeconds = Math.floor(SESSION_TOKEN_TTL_MS / 1000);
  const cookie = createRoomSessionCookie(authToken, maxAgeSeconds);

  return new Response(
    JSON.stringify({
      success: true,
      room: sanitizeRoomData(newRoomData),
      defaults,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
      },
    },
  ) as unknown as CfResponse;
}
