export { PokerRoom } from './poker-room';

// Create a new Worker that handles HTTP requests and WebSocket connections
addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    return handleApiRequest(url, request);
  }

  // Handle WebSocket connections for real-time updates
  if (url.pathname === '/ws') {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 400 });
    }

    const roomKey = url.searchParams.get('room');
    const userName = url.searchParams.get('name');

    if (!roomKey || !userName) {
      return new Response('Missing room key or user name', { status: 400 });
    }

    // Get room ID from the name
    const roomId = getRoomId(roomKey);

    // Get a stub for the Durable Object
    const roomObject = POKER_ROOM.get(POKER_ROOM.idFromName(roomId));

    // Forward the WebSocket request to the Durable Object
    return roomObject.websocket(request);
  }

  // For all other requests, serve the static assets
  // This would typically be handled by Cloudflare Pages or similar
  return new Response('Sprintjam Static Assets Would Be Served Here', {
    headers: { 'Content-Type': 'text/html' },
  });
}

async function handleApiRequest(url, request) {
  const path = url.pathname.substring(5); // Remove '/api/'

  // Create a new room
  if (path === 'rooms' && request.method === 'POST') {
    const { name } = await request.json();

    if (!name) {
      return new Response(JSON.stringify({ error: 'Name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate a unique room key
    const roomKey = generateRoomKey();
    const roomId = getRoomId(roomKey);

    // Get a stub for the Durable Object
    const roomObject = POKER_ROOM.get(POKER_ROOM.idFromName(roomId));

    // Initialize the room
    const response = await roomObject.fetch(
      new Request('https://dummy/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomKey, moderator: name }),
      })
    );

    return response;
  }

  // Join an existing room
  if (path === 'rooms/join' && request.method === 'POST') {
    const { name, roomKey } = await request.json();

    if (!name || !roomKey) {
      return new Response(
        JSON.stringify({ error: 'Name and room key are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const roomId = getRoomId(roomKey);

    // Get a stub for the Durable Object
    const roomObject = POKER_ROOM.get(POKER_ROOM.idFromName(roomId));

    // Check if the room exists and join it
    const response = await roomObject.fetch(
      new Request('https://dummy/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
    );

    return response;
  }

  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Utility functions
function generateRoomKey() {
  // Generate a random 6-character alphanumeric key
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getRoomId(roomKey) {
  // Create a stable ID from the room key
  return `room-${roomKey.toLowerCase()}`;
}
