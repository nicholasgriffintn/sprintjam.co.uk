import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";

import type { Env } from "../types";
import { jsonError } from "../utils/http";
import { getRoomStub } from '../utils/room';
import {
  getSlackTeamInfo,
  getSlackUserInfo,
} from '../services/slack-service';
import { escapeHtml, signState, verifyState } from "../utils/security";

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

export async function initiateSlackOAuthController(
  request: CfRequest,
  env: Env
): Promise<CfResponse> {
  const body = await request.json<{
    roomKey?: string;
    userName?: string;
    sessionToken?: string;
  }>();

  const roomKey = body?.roomKey;
  const userName = body?.userName;
  const sessionToken = body?.sessionToken;

  if (!roomKey || !userName) {
    return jsonError('Room key and user name are required');
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const clientId = env.SLACK_OAUTH_CLIENT_ID;
    const redirectUri =
      env.SLACK_OAUTH_REDIRECT_URI ||
      'https://sprintjam.co.uk/api/slack/oauth/callback';

    if (!clientId || !env.SLACK_OAUTH_CLIENT_SECRET) {
      return jsonError(
        'OAuth not configured. Please contact administrator.',
        500
      );
    }

    const state = await signState(
      { roomKey, userName, nonce: crypto.randomUUID() },
      env.SLACK_OAUTH_CLIENT_SECRET
    );

    const authUrl = new URL('https://slack.com/oauth/v2/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'chat:write,chat:write.public,channels:read,groups:read');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('user_scope', 'identify');

    return jsonResponse({ authorizationUrl: authUrl.toString(), state });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to initiate OAuth';
    return jsonError(message, 500);
  }
}

export async function handleSlackOAuthCallbackController(
  url: URL,
  env: Env
): Promise<CfResponse> {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return new Response(
      `<html><body><h1>OAuth Error</h1><p>${escapeHtml(error)}</p><script>window.close();</script></body></html>`,
      { status: 400, headers: { 'Content-Type': 'text/html' } }
    ) as unknown as CfResponse;
  }

  if (!code || !state) {
    return new Response(
      `<html><body><h1>OAuth Error</h1><p>Missing code or state</p><script>window.close();</script></body></html>`,
      { status: 400, headers: { 'Content-Type': 'text/html' } }
    ) as unknown as CfResponse;
  }

  try {
    const clientId = env.SLACK_OAUTH_CLIENT_ID;
    const clientSecret = env.SLACK_OAUTH_CLIENT_SECRET;
    const redirectUri =
      env.SLACK_OAUTH_REDIRECT_URI ||
      'https://sprintjam.co.uk/api/slack/oauth/callback';

    if (!clientId || !clientSecret) {
      return new Response(
        `<html><body><h1>OAuth Error</h1><p>OAuth not configured</p><script>window.close();</script></body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      ) as unknown as CfResponse;
    }

    const stateData = (await verifyState(state, clientSecret)) as {
      roomKey: string;
      userName: string;
      nonce: string;
    };
    const { roomKey, userName } = stateData;

    const tokenResponse = await fetch(
      'https://slack.com/api/oauth.v2.access',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }).toString(),
      }
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return new Response(
        `<html><body><h1>OAuth Error</h1><p>Failed to exchange code for token</p><script>window.close();</script></body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      ) as unknown as CfResponse;
    }

    const tokenData = await tokenResponse.json<{
      ok: boolean;
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type: string;
      scope?: string;
      team?: {
        id: string;
        name: string;
      };
      authed_user?: {
        id: string;
        access_token?: string;
      };
      error?: string;
    }>();

    if (!tokenData.ok) {
      console.error('Token exchange failed:', tokenData.error);
      return new Response(
        `<html><body><h1>OAuth Error</h1><p>${escapeHtml(tokenData.error || 'Unknown error')}</p><script>window.close();</script></body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      ) as unknown as CfResponse;
    }

    let slackTeamId: string | null = null;
    let slackTeamName: string | null = null;
    if (tokenData.team) {
      slackTeamId = tokenData.team.id;
      slackTeamName = tokenData.team.name;
    } else {
      try {
        const team = await getSlackTeamInfo(tokenData.access_token);
        slackTeamId = team.id;
        slackTeamName = team.name;
      } catch (teamError) {
        console.error('Failed to fetch Slack team:', teamError);
      }
    }

    let slackUserId: string | null = null;
    let slackUserName: string | null = null;
    if (tokenData.authed_user) {
      slackUserId = tokenData.authed_user.id;
    }

    try {
      const user = await getSlackUserInfo(tokenData.access_token);
      slackUserId = user.id;
      slackUserName = user.name;
    } catch (userError) {
      console.error('Failed to fetch Slack user:', userError);
    }

    const roomObject = getRoomStub(env, roomKey);
    const saveResponse = await roomObject.fetch(
      new Request('https://dummy/slack/oauth/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          tokenType: tokenData.token_type,
          expiresAt: tokenData.expires_in
            ? Date.now() + tokenData.expires_in * 1000
            : Date.now() + (365 * 24 * 60 * 60 * 1000), // Default to 1 year if no expiry
          scope: tokenData.scope || null,
          slackTeamId,
          slackTeamName,
          slackUserId,
          slackUserName,
          authorizedBy: userName,
        }),
      }) as unknown as CfRequest
    );

    if (!saveResponse.ok) {
      return new Response(
        `<html><body><h1>OAuth Error</h1><p>Failed to save credentials</p><script>window.close();</script></body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      ) as unknown as CfResponse;
    }

    return new Response(
      `<html><body><h1>Success!</h1><p>Slack connected successfully. You can close this window.</p><script>window.close();</script></body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    ) as unknown as CfResponse;
  } catch (error) {
    console.error('OAuth callback error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      `<html><body><h1>OAuth Error</h1><p>${escapeHtml(message)}</p><script>window.close();</script></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    ) as unknown as CfResponse;
  }
}

export async function getSlackOAuthStatusController(
  url: URL,
  env: Env
): Promise<CfResponse> {
  const roomKey = url.searchParams.get('roomKey');
  const userName = url.searchParams.get('userName');
  const sessionToken = url.searchParams.get('sessionToken');

  if (!roomKey || !userName) {
    return jsonError('Room key and user name are required');
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const roomObject = getRoomStub(env, roomKey);
    const statusUrl = new URL('https://dummy/slack/oauth/status');
    statusUrl.searchParams.set('roomKey', roomKey);
    statusUrl.searchParams.set('userName', userName);
    statusUrl.searchParams.set('sessionToken', sessionToken ?? '');

    const response = await roomObject.fetch(
      new Request(statusUrl.toString(), {
        method: 'GET',
      }) as unknown as CfRequest
    );

    if (!response.ok) {
      return jsonError('Failed to get OAuth status', 500);
    }

    const data = await response.json<{
      connected: boolean;
      slackTeamId?: string;
      slackTeamName?: string;
      slackUserName?: string;
      expiresAt?: number;
    }>();

    return jsonResponse(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to get OAuth status';
    return jsonError(message, 500);
  }
}

export async function revokeSlackOAuthController(
  request: CfRequest,
  env: Env
): Promise<CfResponse> {
  const body = await request.json<{
    roomKey?: string;
    userName?: string;
    sessionToken?: string;
  }>();

  const roomKey = body?.roomKey;
  const userName = body?.userName;
  const sessionToken = body?.sessionToken;

  if (!roomKey || !userName) {
    return jsonError('Room key and user name are required');
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const roomObject = getRoomStub(env, roomKey);
    const response = await roomObject.fetch(
      new Request('https://dummy/slack/oauth/revoke', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomKey, userName, sessionToken }),
      }) as unknown as CfRequest
    );

    if (!response.ok) {
      return jsonError('Failed to revoke OAuth credentials', 500);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to revoke OAuth credentials';
    return jsonError(message, 500);
  }
}
