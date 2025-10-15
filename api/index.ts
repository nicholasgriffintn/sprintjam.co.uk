import type {
  ExportedHandler,
  Request as CfRequest,
  Response as CfResponse,
} from '@cloudflare/workers-types';

import { PokerRoom } from './poker-room';
import { Env } from './types';
import { generateRoomKey, getRoomId } from './utils/room';
import { fetchJiraTicket, updateJiraStoryPoints } from './jira-service';
import { getServerDefaults } from './utils/defaults';

async function handleRequest(
  request: CfRequest,
  env: Env
): Promise<CfResponse> {
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    return handleApiRequest(url, request, env);
  }

  if (url.pathname === '/ws') {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', {
        status: 400,
      }) as unknown as CfResponse;
    }

    const roomKey = url.searchParams.get('room');
    const userName = url.searchParams.get('name');

    if (!roomKey || !userName) {
      return new Response('Missing room key or user name', {
        status: 400,
      }) as unknown as CfResponse;
    }

    const roomId = getRoomId(roomKey);

    const roomObject = env.POKER_ROOM.get(env.POKER_ROOM.idFromName(roomId));
    console.log('roomObject', roomObject);

    return env.POKER_ROOM.get(env.POKER_ROOM.idFromName(roomId)).fetch(request);
  }

  return env.ASSETS.fetch(request);
}

async function handleApiRequest(
  url: URL,
  request: CfRequest,
  env: Env
): Promise<CfResponse> {
  const path = url.pathname.substring(5);

  if (path === 'defaults' && request.method === 'GET') {
    const defaultsPayload = getServerDefaults();

    return new Response(JSON.stringify(defaultsPayload), {
      headers: { 'Content-Type': 'application/json' },
    }) as unknown as CfResponse;
  }

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
      return new Response(JSON.stringify({ error: 'Room key is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }) as unknown as CfResponse;
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
      settings?: Record<string, unknown>;
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

  if (path === 'jira/ticket' && request.method === 'GET') {
    const ticketId = url.searchParams.get('ticketId');
    const roomKey = url.searchParams.get('roomKey');
    const userName = url.searchParams.get('userName');

    if (!ticketId) {
      return new Response(JSON.stringify({ error: 'Ticket ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }) as unknown as CfResponse;
    }

    try {
      if (!roomKey || !userName) {
        return new Response(
          JSON.stringify({ error: 'Room key and user name are required' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        ) as unknown as CfResponse;
      }

      const jiraDomain = env.JIRA_DOMAIN || 'YOUR_DOMAIN.atlassian.net';
      const jiraEmail = env.JIRA_EMAIL || 'YOUR_EMAIL';
      const jiraApiToken = env.JIRA_API_TOKEN || 'YOUR_API_TOKEN';
      const jiraStoryPointsField = env.JIRA_STORY_POINTS_FIELD || '';

      const ticket = await fetchJiraTicket(
        jiraDomain,
        jiraEmail,
        jiraApiToken,
        jiraStoryPointsField,
        ticketId
      );

      const roomId = getRoomId(roomKey);
      const roomObject = env.POKER_ROOM.get(env.POKER_ROOM.idFromName(roomId));

      try {
        const response = await roomObject.fetch(
          new Request('https://dummy/jira/ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: userName, ticket }),
          }) as unknown as CfRequest
        );

        return response;
      } catch (roomError) {
        return new Response(
          JSON.stringify({
            error:
              roomError instanceof Error
                ? roomError.message
                : 'Failed to store Jira ticket in room',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        ) as unknown as CfResponse;
      }
    } catch (error) {
      return new Response(
        JSON.stringify({
          error:
            error instanceof Error
              ? error.message
              : 'Failed to fetch Jira ticket',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      ) as unknown as CfResponse;
    }
  }

  if (
    path.startsWith('jira/ticket/') &&
    path.endsWith('/storyPoints') &&
    request.method === 'PUT'
  ) {
    const ticketId = path.split('/')[2];
    const body = await request.json<{
      storyPoints?: number;
      roomKey?: string;
      userName?: string;
    }>();
    const storyPoints = body?.storyPoints;
    const roomKey = body?.roomKey;
    const userName = body?.userName;

    if (!ticketId || storyPoints === undefined) {
      return new Response(
        JSON.stringify({ error: 'Ticket ID and story points are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      ) as unknown as CfResponse;
    }

    try {
      if (!roomKey || !userName) {
        return new Response(
          JSON.stringify({ error: 'Room key and user name are required' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        ) as unknown as CfResponse;
      }

      const jiraDomain = env.JIRA_DOMAIN || 'YOUR_DOMAIN.atlassian.net';
      const jiraEmail = env.JIRA_EMAIL || 'YOUR_EMAIL';
      const jiraApiToken = env.JIRA_API_TOKEN || 'YOUR_API_TOKEN';
      const jiraStoryPointsField = env.JIRA_STORY_POINTS_FIELD || '';

      const updatedTicket = await updateJiraStoryPoints(
        jiraDomain,
        jiraEmail,
        jiraApiToken,
        jiraStoryPointsField,
        ticketId,
        storyPoints
      );

      const roomId = getRoomId(roomKey);
      const roomObject = env.POKER_ROOM.get(env.POKER_ROOM.idFromName(roomId));

      try {
        await roomObject.fetch(
          new Request('https://dummy/jira/ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticket: updatedTicket, name: userName }),
          }) as unknown as CfRequest
        );
      } catch (roomError) {
        console.error('Failed to update Jira ticket in room:', roomError);
      }

      return new Response(JSON.stringify({ ticket: updatedTicket }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as unknown as CfResponse;
    } catch (error) {
      return new Response(
        JSON.stringify({
          error:
            error instanceof Error
              ? error.message
              : 'Failed to update Jira story points',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      ) as unknown as CfResponse;
    }
  }

  if (path === 'jira/ticket/clear' && request.method === 'POST') {
    const body = await request.json<{ roomKey?: string; userName?: string }>();
    const roomKey = body?.roomKey;
    const userName = body?.userName;

    if (!roomKey || !userName) {
      return new Response(
        JSON.stringify({ error: 'Room key and user name are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      ) as unknown as CfResponse;
    }

    const roomId = getRoomId(roomKey);
    const roomObject = env.POKER_ROOM.get(env.POKER_ROOM.idFromName(roomId));

    try {
      const response = await roomObject.fetch(
        new Request('https://dummy/jira/ticket/clear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: userName }),
        }) as unknown as CfRequest
      );

      return response;
    } catch (error) {
      return new Response(
        JSON.stringify({
          error:
            error instanceof Error
              ? error.message
              : 'Failed to clear Jira ticket',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      ) as unknown as CfResponse;
    }
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
