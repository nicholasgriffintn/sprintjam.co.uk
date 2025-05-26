import type {
	ExportedHandler,
	Request as CfRequest,
	Response as CfResponse,
} from '@cloudflare/workers-types';

import { PokerRoom } from './poker-room';
import { Env } from './types';
import { generateRoomKey, getRoomId } from './utils/room';

async function handleRequest(request: CfRequest, env: Env): Promise<CfResponse> {
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    return handleApiRequest(url, request, env);
  }

  if (url.pathname === '/ws') {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 400 }) as unknown as CfResponse;
    }

    const roomKey = url.searchParams.get('room');
    const userName = url.searchParams.get('name');

    if (!roomKey || !userName) {
      return new Response('Missing room key or user name', { status: 400 }) as unknown as CfResponse;
    }

    const roomId = getRoomId(roomKey);

    const roomObject = env.POKER_ROOM.get(env.POKER_ROOM.idFromName(roomId));
    console.log('roomObject', roomObject);

    return env.POKER_ROOM.get(env.POKER_ROOM.idFromName(roomId)).fetch(request);
  }

  return env.ASSETS.fetch(request);
}

async function handleApiRequest(url: URL, request: CfRequest, env: Env): Promise<CfResponse> {
  const path = url.pathname.substring(5);

  if (path === 'rooms' && request.method === 'POST') {
    const body = await request.json<{ name?: string }>();
    const name = body?.name;

    if (!name) {
      return new Response(JSON.stringify({ error: 'Name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }) as unknown as CfResponse;
    }

    const roomKey = generateRoomKey();
    const roomId = getRoomId(roomKey);

    const roomObject = env.POKER_ROOM.get(env.POKER_ROOM.idFromName(roomId));

    const response = await roomObject.fetch(
      new Request('https://dummy/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomKey, moderator: name }),
      }) as unknown as CfRequest
    );

    return response;
  }

  if (path === 'rooms/join' && request.method === 'POST') {
    const body = await request.json<{ name?: string; roomKey?: string }>();
    const name = body?.name;
    const roomKey = body?.roomKey;

    if (!name || !roomKey) {
      return new Response(
        JSON.stringify({ error: 'Name and room key are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      ) as unknown as CfResponse;
    }

    const roomId = getRoomId(roomKey);

    const roomObject = env.POKER_ROOM.get(env.POKER_ROOM.idFromName(roomId));

    const response = await roomObject.fetch(
      new Request('https://dummy/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }) as unknown as CfRequest
    );

    return response;
  }

  if (path === 'rooms/settings' && request.method === 'GET') {
    const roomKey = url.searchParams.get('roomKey');

    if (!roomKey) {
      return new Response(
        JSON.stringify({ error: 'Room key is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      ) as unknown as CfResponse;
    }

    const roomId = getRoomId(roomKey);
    const roomObject = env.POKER_ROOM.get(env.POKER_ROOM.idFromName(roomId));

    return roomObject.fetch(
      new Request('https://dummy/settings', {
        method: 'GET',
      }) as unknown as CfRequest
    );
  }

  if (path === 'rooms/settings' && request.method === 'PUT') {
    const body = await request.json<{ 
      name?: string; 
      roomKey?: string; 
      settings?: Record<string, unknown> 
    }>();
    
    const name = body?.name;
    const roomKey = body?.roomKey;
    const settings = body?.settings;

    if (!name || !roomKey || !settings) {
      return new Response(
        JSON.stringify({ error: 'Name, room key, and settings are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      ) as unknown as CfResponse;
    }

    const roomId = getRoomId(roomKey);
    const roomObject = env.POKER_ROOM.get(env.POKER_ROOM.idFromName(roomId));

    return roomObject.fetch(
      new Request('https://dummy/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, settings }),
      }) as unknown as CfRequest
    );
  }

  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as CfResponse;
}

export default {
	async fetch(request: CfRequest, env: Env): Promise<CfResponse> {
		return handleRequest(request, env);
	},
} satisfies ExportedHandler<Env>;

export { PokerRoom };