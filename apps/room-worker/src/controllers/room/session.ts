import { createJsonResponse, findCanonicalUserName } from '@sprintjam/utils';

import type { CfResponse, PlanningRoomHttpContext } from './types';

export async function handleSessionValidation(
  ctx: PlanningRoomHttpContext,
  request: Request
): Promise<CfResponse> {
  const { name, sessionToken } = (await request.json()) as {
    name?: string;
    sessionToken?: string;
  };

  if (!name || !sessionToken) {
    return createJsonResponse(
      { error: 'Missing user name or session token' },
      400
    );
  }

  const roomData = await ctx.getRoomData();
  if (!roomData || !roomData.key) {
    return createJsonResponse({ error: 'Room not found' }, 404);
  }

  const canonicalName = findCanonicalUserName(roomData, name);

  if (!canonicalName) {
    return createJsonResponse({ error: 'Invalid session' }, 401);
  }

  const isMember = roomData.users.includes(canonicalName);
  const tokenValid = ctx.repository.validateSessionToken(
    canonicalName,
    sessionToken
  );

  if (!isMember || !tokenValid) {
    return createJsonResponse({ error: 'Invalid session' }, 401);
  }

  return createJsonResponse({ success: true });
}
