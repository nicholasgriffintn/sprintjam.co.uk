import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { RoomWorkerEnv, JiraFieldDefinition } from '@sprintjam/types';
import {
  jsonError,
  getRoomStub,
  escapeHtml,
  signState,
  verifyState,
} from '@sprintjam/utils';
import {
  fetchJiraFields,
  findDefaultSprintField,
  findDefaultStoryPointsField,
} from '@sprintjam/services';

function jsonResponse(payload: unknown, status = 200): CfResponse {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  }) as unknown as CfResponse;
}

async function validateSession(
  env: RoomWorkerEnv,
  roomKey: string,
  userName: string,
  sessionToken?: string | null
) {
  if (!sessionToken) {
    throw new Error('Missing session token');
  }

  const roomObject = getRoomStub(env, roomKey);
  const response = await roomObject.fetch(
    new Request('https://internal/session/validate', {
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

export async function initiateJiraOAuthController(
  request: CfRequest,
  env: RoomWorkerEnv
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

    const clientId = env.JIRA_OAUTH_CLIENT_ID;
    const redirectUri =
      env.JIRA_OAUTH_REDIRECT_URI ||
      'https://sprintjam.co.uk/api/jira/oauth/callback';

    if (!clientId || !env.JIRA_OAUTH_CLIENT_SECRET) {
      return jsonError(
        'OAuth not configured. Please contact administrator.',
        500
      );
    }

    const state = await signState(
      { roomKey, userName, nonce: crypto.randomUUID() },
      env.JIRA_OAUTH_CLIENT_SECRET
    );

    const authUrl = new URL('https://auth.atlassian.com/authorize');
    authUrl.searchParams.set('audience', 'api.atlassian.com');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set(
      'scope',
      'read:jira-work write:jira-work read:board-scope:jira-software read:project:jira read:sprint:jira-software read:issue-details:jira read:jql:jira read:jira-user offline_access'
    );
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('prompt', 'consent');

    return jsonResponse({ authorizationUrl: authUrl.toString(), state });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to initiate OAuth';
    return jsonError(message, 500);
  }
}

export async function handleJiraOAuthCallbackController(
  url: URL,
  env: RoomWorkerEnv
): Promise<CfResponse> {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return new Response(
      `<html><body><h1>OAuth Error</h1><p>${escapeHtml(
        error
      )}</p></body></html>`,
      { status: 400, headers: { 'Content-Type': 'text/html' } }
    ) as unknown as CfResponse;
  }

  if (!code || !state) {
    return new Response(
      `<html><body><h1>OAuth Error</h1><p>Missing code or state</p></body></html>`,
      { status: 400, headers: { 'Content-Type': 'text/html' } }
    ) as unknown as CfResponse;
  }

  try {
    const clientId = env.JIRA_OAUTH_CLIENT_ID;
    const clientSecret = env.JIRA_OAUTH_CLIENT_SECRET;
    const redirectUri =
      env.JIRA_OAUTH_REDIRECT_URI ||
      'https://sprintjam.co.uk/api/jira/oauth/callback';

    if (!clientId || !clientSecret) {
      return new Response(
        `<html><body><h1>OAuth Error</h1><p>OAuth not configured</p></body></html>`,
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
      'https://auth.atlassian.com/oauth/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return new Response(
        `<html><body><h1>OAuth Error</h1><p>Failed to exchange code for token</p></body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      ) as unknown as CfResponse;
    }

    const tokenData = await tokenResponse.json<{
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
      scope: string;
    }>();

    const resourcesResponse = await fetch(
      'https://api.atlassian.com/oauth/token/accessible-resources',
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/json',
        },
      }
    );

    if (!resourcesResponse.ok) {
      return new Response(
        `<html><body><h1>OAuth Error</h1><p>Failed to fetch Jira resources</p></body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      ) as unknown as CfResponse;
    }

    const resources = await resourcesResponse.json<
      Array<{
        id: string;
        url: string;
        name: string;
        scopes: string[];
      }>
    >();

    if (resources.length === 0) {
      return new Response(
        `<html><body><h1>OAuth Error</h1><p>No Jira sites accessible</p></body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      ) as unknown as CfResponse;
    }
    const requiredScopes = [
      'read:board-scope:jira-software',
      'read:sprint:jira-software',
      'read:issue-details:jira',
    ];
    const jiraResource =
      resources.find((resource) =>
        requiredScopes.every((scope) => resource.scopes.includes(scope))
      ) ?? resources[0];
    const jiraDomain = new URL(jiraResource.url).hostname;

    const userResponse = await fetch(
      `https://api.atlassian.com/ex/jira/${jiraResource.id}/rest/api/3/myself`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/json',
        },
      }
    );

    let jiraUserEmail: string | null = null;
    let jiraUserId: string | null = null;
    if (userResponse.ok) {
      const userData = await userResponse.json<{
        accountId: string;
        emailAddress?: string;
      }>();
      jiraUserId = userData.accountId;
      jiraUserEmail = userData.emailAddress || null;
    }

    let storyPointsField: string | null = null;
    let sprintField: string | null = null;

    try {
      const fieldsResponse = await fetch(
        `https://api.atlassian.com/ex/jira/${jiraResource.id}/rest/api/3/field`,
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: 'application/json',
          },
        }
      );

      if (fieldsResponse.ok) {
        const fields = (await fieldsResponse.json()) as JiraFieldDefinition[];
        storyPointsField = findDefaultStoryPointsField(fields);
        sprintField = findDefaultSprintField(fields);
      }
    } catch (fieldError) {
      console.error('Failed to pre-select Jira fields', fieldError);
    }

    const roomObject = getRoomStub(env, roomKey);
    const saveResponse = await roomObject.fetch(
      new Request('https://internal/jira/oauth/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          tokenType: tokenData.token_type,
          expiresAt: Date.now() + tokenData.expires_in * 1000,
          scope: tokenData.scope,
          jiraDomain,
          jiraCloudId: jiraResource.id,
          jiraUserId,
          jiraUserEmail,
          authorizedBy: userName,
          storyPointsField,
          sprintField,
        }),
      }) as unknown as CfRequest
    );

    if (!saveResponse.ok) {
      return new Response(
        `<html><body><h1>OAuth Error</h1><p>Failed to save credentials</p></body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      ) as unknown as CfResponse;
    }

    return new Response(
      `<html><body><h1>Success!</h1><p>Jira connected successfully. You can close this window.</p></body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    ) as unknown as CfResponse;
  } catch (error) {
    console.error('OAuth callback error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      `<html><body><h1>OAuth Error</h1><p>${escapeHtml(
        message
      )}</p></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    ) as unknown as CfResponse;
  }
}

export async function getJiraOAuthStatusController(
  url: URL,
  env: RoomWorkerEnv
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
    const statusUrl = new URL('https://internal/jira/oauth/status');
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
      jiraDomain?: string;
      jiraUserEmail?: string;
      expiresAt?: number;
      storyPointsField?: string | null;
      sprintField?: string | null;
    }>();

    return jsonResponse(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to get OAuth status';
    return jsonError(message, 500);
  }
}

export async function revokeJiraOAuthController(
  request: CfRequest,
  env: RoomWorkerEnv
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
      new Request('https://internal/jira/oauth/revoke', {
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
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to revoke OAuth credentials';
    return jsonError(message, 500);
  }
}

export async function getJiraFieldsController(
  url: URL,
  env: RoomWorkerEnv
): Promise<CfResponse> {
  const roomKey = url.searchParams.get('roomKey');
  const userName = url.searchParams.get('userName');
  const sessionToken = url.searchParams.get('sessionToken');

  if (!roomKey || !userName) {
    return jsonError('Room key and user name are required');
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const clientId = env.JIRA_OAUTH_CLIENT_ID;
    const clientSecret = env.JIRA_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return jsonError('Jira OAuth not configured', 500);
    }

    const roomObject = getRoomStub(env, roomKey);
    const credentialsResponse = await roomObject.fetch(
      new Request('https://internal/jira/oauth/credentials', {
        method: 'GET',
      }) as unknown as CfRequest
    );

    if (!credentialsResponse.ok) {
      return jsonError(
        'Jira not connected. Please connect your Jira account in settings.',
        401
      );
    }

    const { credentials } = await credentialsResponse.json<{
      credentials: {
        id: number;
        roomKey: string;
        accessToken: string;
        refreshToken: string | null;
        tokenType: string;
        expiresAt: number;
        scope: string | null;
        jiraDomain: string;
        jiraCloudId: string | null;
        jiraUserId: string | null;
        jiraUserEmail: string | null;
        storyPointsField: string | null;
        sprintField: string | null;
        authorizedBy: string;
        createdAt: number;
        updatedAt: number;
      };
    }>();

    const onTokenRefresh = async (
      accessToken: string,
      refreshToken: string,
      expiresAt: number
    ) => {
      await roomObject.fetch(
        new Request('https://internal/jira/oauth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken, refreshToken, expiresAt }),
        }) as unknown as CfRequest
      );
    };

    const fields = await fetchJiraFields(
      credentials,
      onTokenRefresh,
      clientId,
      clientSecret
    );

    const simplifiedFields = fields.map((field) => ({
      id: field.id,
      name: field.name,
      type: field.schema?.type ?? field.schema?.system ?? null,
      custom: !!field.schema?.custom,
    }));

    return jsonResponse({
      fields: simplifiedFields,
      storyPointsField: credentials.storyPointsField,
      sprintField: credentials.sprintField,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch Jira fields';
    const isAuth =
      message.toLowerCase().includes('session') ||
      message.toLowerCase().includes('oauth') ||
      message.toLowerCase().includes('reconnect');
    return jsonError(message, isAuth ? 401 : 500);
  }
}

export async function updateJiraFieldsController(
  request: CfRequest,
  env: RoomWorkerEnv
): Promise<CfResponse> {
  const body = await request.json<{
    roomKey?: string;
    userName?: string;
    sessionToken?: string;
    storyPointsField?: string | null;
    sprintField?: string | null;
  }>();

  const roomKey = body?.roomKey;
  const userName = body?.userName;
  const sessionToken = body?.sessionToken;
  const { storyPointsField, sprintField } = body;

  if (!roomKey || !userName) {
    return jsonError('Room key and user name are required');
  }

  if (storyPointsField === undefined && sprintField === undefined) {
    return jsonError('No field updates provided', 400);
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const clientId = env.JIRA_OAUTH_CLIENT_ID;
    const clientSecret = env.JIRA_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return jsonError('Jira OAuth not configured', 500);
    }

    const roomObject = getRoomStub(env, roomKey);
    const credentialsResponse = await roomObject.fetch(
      new Request('https://internal/jira/oauth/credentials', {
        method: 'GET',
      }) as unknown as CfRequest
    );

    if (!credentialsResponse.ok) {
      return jsonError(
        'Jira not connected. Please connect your Jira account in settings.',
        401
      );
    }

    const { credentials } = await credentialsResponse.json<{
      credentials: {
        id: number;
        roomKey: string;
        accessToken: string;
        refreshToken: string | null;
        tokenType: string;
        expiresAt: number;
        scope: string | null;
        jiraDomain: string;
        jiraCloudId: string | null;
        jiraUserId: string | null;
        jiraUserEmail: string | null;
        storyPointsField: string | null;
        sprintField: string | null;
        authorizedBy: string;
        createdAt: number;
        updatedAt: number;
      };
    }>();

    const onTokenRefresh = async (
      accessToken: string,
      refreshToken: string,
      expiresAt: number
    ) => {
      await roomObject.fetch(
        new Request('https://internal/jira/oauth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken, refreshToken, expiresAt }),
        }) as unknown as CfRequest
      );
    };

    const fields = await fetchJiraFields(
      credentials,
      onTokenRefresh,
      clientId,
      clientSecret
    );
    const validFieldIds = new Set(fields.map((field) => field.id));

    if (storyPointsField && !validFieldIds.has(storyPointsField)) {
      return jsonError(
        'Selected story points field is not available in Jira',
        400
      );
    }

    if (sprintField && !validFieldIds.has(sprintField)) {
      return jsonError('Selected sprint field is not available in Jira', 400);
    }

    const updateResponse = await roomObject.fetch(
      new Request('https://internal/jira/oauth/fields', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyPointsField, sprintField }),
      }) as unknown as CfRequest
    );

    if (!updateResponse.ok) {
      return jsonError('Failed to save Jira field configuration', 500);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to update Jira field configuration';
    const isAuth =
      message.toLowerCase().includes('session') ||
      message.toLowerCase().includes('oauth') ||
      message.toLowerCase().includes('reconnect');
    return jsonError(message, isAuth ? 401 : 500);
  }
}
