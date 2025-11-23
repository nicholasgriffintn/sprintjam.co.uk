import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";

import type { Env, RoomData } from "../types";
import { jsonError } from "../utils/http";
import { getRoomStub } from '../utils/room';
import {
  postSlackMessage,
  formatVotingResultsForSlack,
  formatSessionStartForSlack,
} from '../services/slack-service';

function jsonResponse(payload: unknown, status = 200): CfResponse {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as CfResponse;
}

async function validateSession(
  env: Env,
  roomKey: string,
  userName: string,
  sessionToken?: string | null
) {
  if (!sessionToken) {
    throw new Error('Missing session token');
  }

  const roomObject = getRoomStub(env, roomKey);
  const response = await roomObject.fetch(
    new Request('https://dummy/session/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: userName, sessionToken }),
    }) as unknown as CfRequest
  );

  if (!response.ok) {
    const error = await response.json<{
      error?: string;
    }>();
    throw new Error(error.error || 'Invalid session');
  }
}

async function getSlackCredentials(env: Env, roomKey: string) {
  const roomObject = getRoomStub(env, roomKey);
  const response = await roomObject.fetch(
    new Request('https://dummy/slack/oauth/credentials', {
      method: 'GET',
    }) as unknown as CfRequest
  );

  if (!response.ok) {
    return null;
  }

  return await response.json<{
    id: number;
    roomKey: string;
    accessToken: string;
    refreshToken: string | null;
    tokenType: string;
    expiresAt: number;
    scope: string | null;
    slackTeamId: string | null;
    slackTeamName: string | null;
    slackChannelId: string | null;
    slackChannelName: string | null;
    slackUserId: string | null;
    slackUserName: string | null;
    authorizedBy: string;
    createdAt: number;
    updatedAt: number;
  }>();
}

async function updateSlackTokens(
  env: Env,
  roomKey: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: number
) {
  const roomObject = getRoomStub(env, roomKey);
  await roomObject.fetch(
    new Request('https://dummy/slack/oauth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, refreshToken, expiresAt }),
    }) as unknown as CfRequest
  );
}

export async function postSessionResultsController(
  request: CfRequest,
  env: Env
): Promise<CfResponse> {
  const body = await request.json<{
    roomKey?: string;
    userName?: string;
    sessionToken?: string;
    roomData?: RoomData;
  }>();

  const roomKey = body?.roomKey;
  const userName = body?.userName;
  const sessionToken = body?.sessionToken;
  const roomData = body?.roomData;

  if (!roomKey || !userName || !roomData) {
    return jsonError('Room key, user name, and room data are required');
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const credentials = await getSlackCredentials(env, roomKey);

    if (!credentials) {
      return jsonError('Slack not connected', 404);
    }

    if (!credentials.slackChannelId) {
      return jsonError('No Slack channel configured', 400);
    }

    const clientId = env.SLACK_OAUTH_CLIENT_ID;
    const clientSecret = env.SLACK_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return jsonError('Slack OAuth not configured', 500);
    }

    const message = formatVotingResultsForSlack(roomData);
    message.channel = credentials.slackChannelId;

    const result = await postSlackMessage(
      credentials,
      message,
      async (accessToken, refreshToken, expiresAt) => {
        await updateSlackTokens(env, roomKey, accessToken, refreshToken, expiresAt);
      },
      clientId,
      clientSecret
    );

    return jsonResponse({
      success: true,
      messageTs: result.ts,
      channel: result.channel,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to post to Slack';
    return jsonError(message, 500);
  }
}

export async function postSessionStartController(
  request: CfRequest,
  env: Env
): Promise<CfResponse> {
  const body = await request.json<{
    roomKey?: string;
    userName?: string;
    sessionToken?: string;
    roomData?: RoomData;
  }>();

  const roomKey = body?.roomKey;
  const userName = body?.userName;
  const sessionToken = body?.sessionToken;
  const roomData = body?.roomData;

  if (!roomKey || !userName || !roomData) {
    return jsonError('Room key, user name, and room data are required');
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const credentials = await getSlackCredentials(env, roomKey);

    if (!credentials) {
      return jsonError('Slack not connected', 404);
    }

    if (!credentials.slackChannelId) {
      return jsonError('No Slack channel configured', 400);
    }

    const clientId = env.SLACK_OAUTH_CLIENT_ID;
    const clientSecret = env.SLACK_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return jsonError('Slack OAuth not configured', 500);
    }

    const message = formatSessionStartForSlack(roomData);
    message.channel = credentials.slackChannelId;

    const result = await postSlackMessage(
      credentials,
      message,
      async (accessToken, refreshToken, expiresAt) => {
        await updateSlackTokens(env, roomKey, accessToken, refreshToken, expiresAt);
      },
      clientId,
      clientSecret
    );

    return jsonResponse({
      success: true,
      messageTs: result.ts,
      channel: result.channel,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to post to Slack';
    return jsonError(message, 500);
  }
}

export async function postCustomMessageController(
  request: CfRequest,
  env: Env
): Promise<CfResponse> {
  const body = await request.json<{
    roomKey?: string;
    userName?: string;
    sessionToken?: string;
    text: string;
  }>();

  const roomKey = body?.roomKey;
  const userName = body?.userName;
  const sessionToken = body?.sessionToken;
  const text = body?.text;

  if (!roomKey || !userName || !text) {
    return jsonError('Room key, user name, and text are required');
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const credentials = await getSlackCredentials(env, roomKey);

    if (!credentials) {
      return jsonError('Slack not connected', 404);
    }

    if (!credentials.slackChannelId) {
      return jsonError('No Slack channel configured', 400);
    }

    const clientId = env.SLACK_OAUTH_CLIENT_ID;
    const clientSecret = env.SLACK_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return jsonError('Slack OAuth not configured', 500);
    }

    const result = await postSlackMessage(
      credentials,
      {
        channel: credentials.slackChannelId,
        text,
      },
      async (accessToken, refreshToken, expiresAt) => {
        await updateSlackTokens(env, roomKey, accessToken, refreshToken, expiresAt);
      },
      clientId,
      clientSecret
    );

    return jsonResponse({
      success: true,
      messageTs: result.ts,
      channel: result.channel,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to post to Slack';
    return jsonError(message, 500);
  }
}
