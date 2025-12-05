import { getServerDefaults } from '../../utils/defaults';
import {
  assignUserAvatar,
  findCanonicalUserName,
  markUserConnection,
  normalizeRoomData,
  sanitizeRoomData,
} from '../../utils/room-data';
import { createJsonResponse } from '../../utils/http';
import { generateSessionToken, verifyPasscode } from '../../utils/room-cypto';

import type { CfResponse, PlanningRoomHttpContext } from './types';

export async function handleJoin(
  ctx: PlanningRoomHttpContext,
  request: Request
): Promise<CfResponse> {
  const { name, passcode, avatar, authToken } = (await request.json()) as {
    name: string;
    passcode?: string;
    avatar?: string;
    authToken?: string;
  };

  const roomData = await ctx.getRoomData();

  if (!roomData || !roomData.key) {
    return createJsonResponse({ error: 'Room not found' }, 404);
  }

  const normalizedRoomData = normalizeRoomData(roomData);
  const canonicalName =
    findCanonicalUserName(normalizedRoomData, name) ?? name.trim();
  const isConnected = !!normalizedRoomData.connectedUsers?.[canonicalName];
  const storedPasscodeHash = ctx.repository.getPasscodeHash();
  const hasValidSessionToken = ctx.repository.validateSessionToken(
    canonicalName,
    authToken ?? null
  );

  if (storedPasscodeHash && !hasValidSessionToken) {
    const isValidPasscode =
      passcode && (await verifyPasscode(passcode, storedPasscodeHash));

    if (!isValidPasscode) {
      return createJsonResponse({ error: 'Invalid passcode' }, 401);
    }
  }

  if (isConnected && !hasValidSessionToken) {
    return createJsonResponse(
      { error: 'User with this name is already connected' },
      409
    );
  }

  const updatedRoomData = normalizedRoomData;
  markUserConnection(updatedRoomData, canonicalName, true);
  assignUserAvatar(updatedRoomData, canonicalName, avatar);

  ctx.repository.ensureUser(canonicalName);
  ctx.repository.setUserConnection(canonicalName, true);
  ctx.repository.setUserAvatar(canonicalName, avatar);

  ctx.broadcast({
    type: 'userJoined',
    user: canonicalName,
    avatar,
  });

  const newAuthToken = generateSessionToken();
  ctx.repository.setSessionToken(canonicalName, newAuthToken);
  ctx.disconnectUserSessions?.(canonicalName);

  const defaults = getServerDefaults();

  return createJsonResponse({
    success: true,
    room: sanitizeRoomData(updatedRoomData),
    defaults,
    authToken: newAuthToken,
  });
}
