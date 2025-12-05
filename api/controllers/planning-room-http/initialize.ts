import type { RoomSettings } from '../../types';

import { createInitialRoomData, getServerDefaults } from '../../utils/defaults';
import { assignUserAvatar, sanitizeRoomData } from '../../utils/room-data';
import { createJsonResponse } from '../../utils/http';
import { generateSessionToken, hashPasscode } from '../../utils/security';

import type { CfResponse, PlanningRoomHttpContext } from './types';

export async function handleInitialize(
  ctx: PlanningRoomHttpContext,
  request: Request
): Promise<CfResponse> {
  const { roomKey, moderator, passcode, settings, avatar } =
    (await request.json()) as {
      roomKey: string;
      moderator: string;
      passcode?: string;
      settings?: Partial<RoomSettings>;
      avatar?: string;
    };

  const passcodeHash = passcode ? await hashPasscode(passcode) : undefined;
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

  return createJsonResponse({
    success: true,
    room: sanitizeRoomData(newRoomData),
    defaults,
    authToken,
  });
}
