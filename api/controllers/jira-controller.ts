import type {
  Request as CfRequest,
  Response as CfResponse,
} from '@cloudflare/workers-types';

import type { Env, JiraOAuthIntegration } from '../types';
import {
  fetchJiraTicket,
  updateJiraStoryPoints,
} from '../services/jira-service';
import type { JiraAuthConfig } from '../services/jira-service';
import {
  fetchRoomJiraIntegration,
  persistRoomJiraIntegration,
} from '../utils/jira-integration';
import { getRoomStub } from '../utils/room';
import { jsonError } from '../utils/http';

const ATLASSIAN_AUTH_BASE = 'https://auth.atlassian.com';
const TOKEN_REFRESH_THRESHOLD_MS = 60_000;

function getStoryPointsField(env: Env): string {
  return env.JIRA_STORY_POINTS_FIELD || '';
}

function getBasicAuthConfig(env: Env): JiraAuthConfig | null {
  if (env.JIRA_DOMAIN && env.JIRA_EMAIL && env.JIRA_API_TOKEN) {
    return {
      type: 'basic',
      domain: env.JIRA_DOMAIN,
      email: env.JIRA_EMAIL,
      apiToken: env.JIRA_API_TOKEN,
    };
  }

  return null;
}

async function refreshAccessToken(
  env: Env,
  integration: JiraOAuthIntegration
): Promise<JiraOAuthIntegration> {
  if (!env.JIRA_CLIENT_ID || !env.JIRA_CLIENT_SECRET) {
    throw new Error('Jira OAuth is not configured on the server');
  }

  const response = await fetch(`${ATLASSIAN_AUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: env.JIRA_CLIENT_ID,
      client_secret: env.JIRA_CLIENT_SECRET,
      refresh_token: integration.refreshToken,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to refresh Jira access token: ${response.status} ${errorBody}`
    );
  }

  const tokenData = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  return {
    ...integration,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token ?? integration.refreshToken,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  };
}

async function ensureFreshIntegration(
  env: Env,
  roomKey: string,
  integration: JiraOAuthIntegration
): Promise<JiraOAuthIntegration> {
  if (integration.expiresAt - TOKEN_REFRESH_THRESHOLD_MS > Date.now()) {
    return integration;
  }

  const refreshed = await refreshAccessToken(env, integration);
  await persistRoomJiraIntegration(env, roomKey, refreshed);
  return refreshed;
}

async function resolveJiraAuthConfig(
  env: Env,
  roomKey: string
): Promise<JiraAuthConfig> {
  try {
    const integration = await fetchRoomJiraIntegration(env, roomKey);
    if (integration) {
      const updatedIntegration = await ensureFreshIntegration(
        env,
        roomKey,
        integration
      );
      return {
        type: 'oauth',
        cloudId: updatedIntegration.cloudId,
        siteUrl: updatedIntegration.siteUrl,
        accessToken: updatedIntegration.accessToken,
      };
    }
  } catch (error) {
    console.error('Failed to load Jira integration for room', error);
    throw error;
  }

  const basic = getBasicAuthConfig(env);
  if (basic) {
    return basic;
  }

  throw new Error(
    'Jira is not configured. Connect a Jira site or provide API credentials.'
  );
}

function jsonResponse(payload: unknown, status = 200): CfResponse {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as CfResponse;
}

export async function getJiraTicketController(
  url: URL,
  env: Env
): Promise<CfResponse> {
  const ticketId = url.searchParams.get('ticketId');
  const roomKey = url.searchParams.get('roomKey');
  const userName = url.searchParams.get('userName');

  if (!ticketId) {
    return jsonError('Ticket ID is required');
  }

  if (!roomKey || !userName) {
    return jsonError('Room key and user name are required');
  }

  try {
    const storyPointsField = getStoryPointsField(env);
    const authConfig = await resolveJiraAuthConfig(env, roomKey);
    const ticket = await fetchJiraTicket(
      authConfig,
      storyPointsField,
      ticketId
    );

    const roomObject = getRoomStub(env, roomKey);

    try {
      return (await roomObject.fetch(
        new Request('https://dummy/jira/ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: userName, ticket }),
        }) as unknown as CfRequest
      )) as CfResponse;
    } catch (roomError) {
      return jsonError(
        roomError instanceof Error
          ? roomError.message
          : 'Failed to store Jira ticket in room',
        500
      );
    }
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Failed to fetch Jira ticket',
      500
    );
  }
}

export async function updateJiraStoryPointsController(
  ticketId: string,
  request: CfRequest,
  env: Env
): Promise<CfResponse> {
  const body = await request.json<{
    storyPoints?: number;
    roomKey?: string;
    userName?: string;
  }>();
  const storyPoints = body?.storyPoints;
  const roomKey = body?.roomKey;
  const userName = body?.userName;

  if (!ticketId || storyPoints === undefined) {
    return jsonError('Ticket ID and story points are required');
  }

  if (!roomKey || !userName) {
    return jsonError('Room key and user name are required');
  }

  try {
    const storyPointsField = getStoryPointsField(env);
    const authConfig = await resolveJiraAuthConfig(env, roomKey);

    const currentTicket = await fetchJiraTicket(
      authConfig,
      storyPointsField,
      ticketId
    );

    if (!currentTicket) {
      return jsonError('Jira ticket not found', 404);
    }

    if (currentTicket.storyPoints === storyPoints) {
      return jsonResponse({ ticket: currentTicket });
    }

    const updatedTicket = await updateJiraStoryPoints(
      authConfig,
      storyPointsField,
      ticketId,
      storyPoints,
      currentTicket
    );

    const roomObject = getRoomStub(env, roomKey);

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

    return jsonResponse({ ticket: updatedTicket });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : 'Failed to update Jira story points',
      500
    );
  }
}

export async function clearJiraTicketController(
  request: CfRequest,
  env: Env
): Promise<CfResponse> {
  const body = await request.json<{ roomKey?: string; userName?: string }>();
  const roomKey = body?.roomKey;
  const userName = body?.userName;

  if (!roomKey || !userName) {
    return jsonError('Room key and user name are required');
  }

  const roomObject = getRoomStub(env, roomKey);

  try {
    return (await roomObject.fetch(
      new Request('https://dummy/jira/ticket/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: userName }),
      }) as unknown as CfRequest
    )) as CfResponse;
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Failed to clear Jira ticket',
      500
    );
  }
}
