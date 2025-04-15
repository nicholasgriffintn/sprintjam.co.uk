import type {
	DurableObjectNamespace,
	ExportedHandler,
	Fetcher,
	Request as CfRequest,
	Response as CfResponse,
} from '@cloudflare/workers-types';
import { PokerRoom } from './poker-room';

export interface Env {
	POKER_ROOM: DurableObjectNamespace;
	ASSETS: Fetcher;
}

async function handleRequest(request: CfRequest, env: Env): Promise<CfResponse> {
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    return handleApiRequest(url, request, env);
  }

  // Handle WebSocket connections for real-time updates
  if (url.pathname === '/ws') {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 400 }) as unknown as CfResponse;
    }

    const roomKey = url.searchParams.get('room');
    const userName = url.searchParams.get('name');

    if (!roomKey || !userName) {
      return new Response('Missing room key or user name', { status: 400 }) as unknown as CfResponse;
    }

    // Get room ID from the name
    const roomId = getRoomId(roomKey);

    // Get a stub for the Durable Object using the binding from Env
    const roomObject = env.POKER_ROOM.get(env.POKER_ROOM.idFromName(roomId));
    console.log('roomObject', roomObject);

    // Forward the WebSocket request to the Durable Object's fetch handler
    // Ensure the request object is compatible.
    // The DO stub fetch expects a Request type potentially different from the handler's CfRequest.
    return env.POKER_ROOM.get(env.POKER_ROOM.idFromName(roomId)).fetch(request);
  }

  // For all other requests, serve the static assets
  return env.ASSETS.fetch(request);
}

async function handleApiRequest(url: URL, request: CfRequest, env: Env): Promise<CfResponse> {
  const path = url.pathname.substring(5); // Remove '/api/'

  // Create a new room
  if (path === 'rooms' && request.method === 'POST') {
    // Explicitly type the expected JSON structure
    const body = await request.json<{ name?: string }>();
    const name = body?.name;

    if (!name) {
      return new Response(JSON.stringify({ error: 'Name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }) as unknown as CfResponse; // Added type assertion
    }

    // Generate a unique room key
    const roomKey = generateRoomKey();
    const roomId = getRoomId(roomKey);

    // Get a stub for the Durable Object using the binding from Env
    const roomObject = env.POKER_ROOM.get(env.POKER_ROOM.idFromName(roomId));

    // Initialize the room
    const response = await roomObject.fetch(
      new Request('https://dummy/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomKey, moderator: name }),
      }) as unknown as CfRequest
    );

    return response;
  }

  // Join an existing room
  if (path === 'rooms/join' && request.method === 'POST') {
    // Explicitly type the expected JSON structure
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
      ) as unknown as CfResponse; // Added type assertion
    }

    const roomId = getRoomId(roomKey);

    // Get a stub for the Durable Object using the binding from Env
    const roomObject = env.POKER_ROOM.get(env.POKER_ROOM.idFromName(roomId));

    // Check if the room exists and join it
    const response = await roomObject.fetch(
      new Request('https://dummy/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }) as unknown as CfRequest
    );

    return response;
  }

  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as CfResponse;
}

// Utility functions
function generateRoomKey() {
  // Generate a random 6-character alphanumeric key
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getRoomId(roomKey: string) {
  // Create a stable ID from the room key
  return `room-${roomKey.toLowerCase()}`;
}

export default {
	async fetch(request: CfRequest, env: Env): Promise<CfResponse> {
		return handleRequest(request, env);
	},
} satisfies ExportedHandler<Env>;

export { PokerRoom };