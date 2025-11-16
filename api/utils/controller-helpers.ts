import type { Response as CfResponse } from '@cloudflare/workers-types';

import type { Env } from '../types';
import { getRoomId } from './room';

export function getRoomStub(env: Env, roomKey: string) {
  const roomId = getRoomId(roomKey);
  return env.POKER_ROOM.get(env.POKER_ROOM.idFromName(roomId));
}

export function jsonError(message: string, status = 400): CfResponse {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as CfResponse;
}
