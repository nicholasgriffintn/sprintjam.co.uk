import type {
  Request as CfRequest,
  Response as CfResponse,
} from '@cloudflare/workers-types';

import type { Env, JiraOAuthIntegration } from '../types';
import { getRoomStub } from '../utils/room';
import { createJsonResponse, jsonError } from '../utils/http';

const ATLASSIAN_AUTH_BASE = 'https://auth.atlassian.com';
const ATLASSIAN_API_BASE = 'https://api.atlassian.com';

type OAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
  audience: string;
};

interface AtlassianTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
  token_type: string;
}

interface AccessibleResource {
  id: string;
  url: string;
  name: string;
  scopes?: string[];
}

function decodeState(state: string): { roomKey: string; nonce: string } | null {
  try {
    const normalized = state.replace(/-/g, '+').replace(/_/g, '/');
    const padding = (4 - (normalized.length % 4)) % 4;
    const padded = normalized.padEnd(normalized.length + padding, '=');
    const json = atob(padded);
    const payload = JSON.parse(json) as { roomKey: string; nonce: string };
    if (payload?.roomKey && payload?.nonce) {
      return payload;
    }
  } catch (error) {
    console.error('Failed to decode Jira OAuth state', error);
  }
  return null;
}

function encodeState(roomKey: string, nonce: string): string {
  const payload = JSON.stringify({ roomKey, nonce });
  return btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function sanitizeIntegration(
  integration?: JiraOAuthIntegration
): Omit<JiraOAuthIntegration, 'accessToken' | 'refreshToken'> | undefined {
  if (!integration) {
    return undefined;
  }

  const { accessToken: _a, refreshToken: _r, ...rest } = integration;
  return rest;
}

function resolveOAuthConfig(url: URL, env: Env): OAuthConfig | null {
  const clientId = env.JIRA_CLIENT_ID;
  const clientSecret = env.JIRA_CLIENT_SECRET;
  const redirectUri =
    env.JIRA_OAUTH_REDIRECT_URI ?? `${url.protocol}//${url.host}/api/jira/oauth/callback`;
  const scopes =
    env.JIRA_OAUTH_SCOPES ?? 'read:issue:jira write:issue:jira offline_access';
  const audience = env.JIRA_OAUTH_AUDIENCE ?? 'api.atlassian.com';

  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }

  return { clientId, clientSecret, redirectUri, scopes, audience };
}

async function requestJson<T>(response: Response, errorMessage: string): Promise<T> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${errorMessage}: ${response.status} ${body}`);
  }

  return (await response.json()) as T;
}

export async function startJiraOAuthController(
  url: URL,
  env: Env
): Promise<CfResponse> {
  const roomKey = url.searchParams.get('roomKey');
  const userName = url.searchParams.get('userName');

  if (!roomKey || !userName) {
    return jsonError('Room key and user name are required');
  }

  const config = resolveOAuthConfig(url, env);
  if (!config) {
    return jsonError('Jira OAuth is not configured on the server', 500);
  }

  const nonce = crypto.randomUUID();
  const state = encodeState(roomKey, nonce);
  const roomObject = getRoomStub(env, roomKey);

  const stateResponse = await roomObject.fetch(
    new Request('https://dummy/jira/oauth/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName, nonce }),
    }) as unknown as CfRequest
  );

  if (!stateResponse.ok) {
    const errorPayload = await stateResponse.json().catch(() => undefined);
    return createJsonResponse(errorPayload ?? { error: 'Failed to start OAuth flow' }, stateResponse.status);
  }

  const authorizeUrl = new URL(`${ATLASSIAN_AUTH_BASE}/authorize`);
  authorizeUrl.searchParams.set('audience', config.audience);
  authorizeUrl.searchParams.set('client_id', config.clientId);
  authorizeUrl.searchParams.set('scope', config.scopes);
  authorizeUrl.searchParams.set('redirect_uri', config.redirectUri);
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('prompt', 'consent');

  return createJsonResponse({ url: authorizeUrl.toString(), state });
}

export async function getJiraIntegrationStatusController(
  url: URL,
  env: Env
): Promise<CfResponse> {
  const roomKey = url.searchParams.get('roomKey');

  if (!roomKey) {
    return jsonError('Room key is required');
  }

  const roomObject = getRoomStub(env, roomKey);
  const response = await roomObject.fetch(
    new Request('https://dummy/jira/integration', {
      method: 'GET',
    }) as unknown as CfRequest
  );

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => undefined);
    return createJsonResponse(errorPayload ?? { error: 'Failed to fetch integration' }, response.status);
  }

  const data = (await response.json()) as { integration?: JiraOAuthIntegration };
  return createJsonResponse({ integration: sanitizeIntegration(data.integration) });
}

export async function disconnectJiraIntegrationController(
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
  const response = await roomObject.fetch(
    new Request('https://dummy/jira/integration', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName }),
    }) as unknown as CfRequest
  );

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => undefined);
    return createJsonResponse(errorPayload ?? { error: 'Failed to disconnect Jira' }, response.status);
  }

  return createJsonResponse({ success: true });
}

export async function jiraOAuthCallbackController(
  url: URL,
  env: Env
): Promise<CfResponse> {
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');

  if (!code || !stateParam) {
    return new Response('Missing authorization parameters', { status: 400 }) as unknown as CfResponse;
  }

  const state = decodeState(stateParam);
  if (!state) {
    return new Response('Invalid OAuth state', { status: 400 }) as unknown as CfResponse;
  }

  const config = resolveOAuthConfig(url, env);
  if (!config) {
    return new Response('Jira OAuth is not configured on the server', { status: 500 }) as unknown as CfResponse;
  }

  const roomObject = getRoomStub(env, state.roomKey);
  const stateVerificationResponse = await roomObject.fetch(
    new Request('https://dummy/jira/oauth/state/consume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nonce: state.nonce }),
    }) as unknown as CfRequest
  );

  if (!stateVerificationResponse.ok) {
    const errorPayload = await stateVerificationResponse.json().catch(() => undefined);
    return new Response(
      errorPayload?.error ?? 'Invalid or expired Jira OAuth state',
      { status: stateVerificationResponse.status }
    ) as unknown as CfResponse;
  }

  const stateInfo = (await stateVerificationResponse.json()) as { userName: string };

  const tokenResponse = await fetch(`${ATLASSIAN_AUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    }),
  });

  const tokenData = await requestJson<AtlassianTokenResponse>(
    tokenResponse,
    'Failed to exchange authorization code'
  );

  const resourcesResponse = await fetch(
    `${ATLASSIAN_API_BASE}/oauth/token/accessible-resources`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const resources = await requestJson<AccessibleResource[]>(
    resourcesResponse,
    'Failed to load Jira sites'
  );

  const selectedResource = resources[0];

  if (!selectedResource) {
    return new Response('No Jira sites available for this account', { status: 400 }) as unknown as CfResponse;
  }

  const now = Date.now();
  const integration: JiraOAuthIntegration = {
    type: 'oauth',
    cloudId: selectedResource.id,
    siteUrl: selectedResource.url,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: now + tokenData.expires_in * 1000,
    scopes: selectedResource.scopes ?? tokenData.scope?.split(' ') ?? [],
    connectedBy: stateInfo.userName,
    connectedAt: now,
  };

  const saveResponse = await roomObject.fetch(
    new Request('https://dummy/jira/integration', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ integration, userName: stateInfo.userName }),
    }) as unknown as CfRequest
  );

  if (!saveResponse.ok) {
    const errorPayload = await saveResponse.json().catch(() => undefined);
    return new Response(
      errorPayload?.error ?? 'Failed to store Jira credentials',
      { status: saveResponse.status }
    ) as unknown as CfResponse;
  }

  const successHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Jira Connected</title>
    <style>
      body { font-family: sans-serif; padding: 2rem; text-align: center; }
      .btn { margin-top: 1rem; display: inline-block; padding: 0.5rem 1rem; border-radius: 0.5rem; background: #2563eb; color: #fff; text-decoration: none; }
    </style>
  </head>
  <body>
    <h1>Jira connection successful</h1>
    <p>You can close this window and return to SprintJam.</p>
    <a class="btn" href="#" onclick="window.close(); return false;">Close</a>
  </body>
</html>`;

  return new Response(successHtml, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  }) as unknown as CfResponse;
}
