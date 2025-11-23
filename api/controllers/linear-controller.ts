import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";

import type { Env } from "../types";
import {
  fetchLinearIssue,
  updateLinearEstimate,
  searchLinearIssues,
  fetchLinearIssuesBatch,
  getLinearTeams,
} from "../services/linear-service";
import { jsonError } from "../utils/http";
import { getRoomStub } from '../utils/room';

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

export async function getLinearIssueController(
  url: URL,
  env: Env
): Promise<CfResponse> {
  const issueId = url.searchParams.get('issueId');
  const roomKey = url.searchParams.get('roomKey');
  const userName = url.searchParams.get('userName');
  const sessionToken = url.searchParams.get('sessionToken');

  if (!issueId) {
    return jsonError('Issue ID is required');
  }

  if (!roomKey || !userName) {
    return jsonError('Room key and user name are required');
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const clientId = env.LINEAR_OAUTH_CLIENT_ID;
    const clientSecret = env.LINEAR_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return jsonError('Linear OAuth not configured', 500);
    }

    const roomObject = getRoomStub(env, roomKey);
    const credentialsResponse = await roomObject.fetch(
      new Request('https://dummy/linear/oauth/credentials', {
        method: 'GET',
      }) as unknown as CfRequest
    );

    if (!credentialsResponse.ok) {
      return jsonError(
        'Linear not connected. Please connect your Linear account in settings.',
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
        linearOrganizationId: string | null;
        linearUserId: string | null;
        linearUserEmail: string | null;
        estimateField: string | null;
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
        new Request('https://dummy/linear/oauth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken, refreshToken, expiresAt }),
        }) as unknown as CfRequest
      );
    };

    const issue = await fetchLinearIssue(
      credentials,
      issueId,
      onTokenRefresh,
      clientId,
      clientSecret
    );

    return jsonResponse({ ticket: issue });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch Linear issue';
    const isAuth =
      message.toLowerCase().includes('session') ||
      message.toLowerCase().includes('oauth') ||
      message.toLowerCase().includes('reconnect');
    return jsonError(message, isAuth ? 401 : 500);
  }
}

export async function updateLinearEstimateController(
  issueId: string,
  request: CfRequest,
  env: Env
): Promise<CfResponse> {
  const body = await request.json<{
    estimate?: number;
    roomKey?: string;
    userName?: string;
    sessionToken?: string;
  }>();
  const estimate = body?.estimate;
  const roomKey = body?.roomKey;
  const userName = body?.userName;
  const sessionToken = body?.sessionToken;

  if (!issueId || estimate === undefined) {
    return jsonError('Issue ID and estimate are required');
  }

  if (!roomKey || !userName) {
    return jsonError('Room key and user name are required');
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const clientId = env.LINEAR_OAUTH_CLIENT_ID;
    const clientSecret = env.LINEAR_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return jsonError('Linear OAuth not configured', 500);
    }

    const roomObject = getRoomStub(env, roomKey);
    const credentialsResponse = await roomObject.fetch(
      new Request('https://dummy/linear/oauth/credentials', {
        method: 'GET',
      }) as unknown as CfRequest
    );

    if (!credentialsResponse.ok) {
      return jsonError(
        'Linear not connected. Please connect your Linear account in settings.',
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
        linearOrganizationId: string | null;
        linearUserId: string | null;
        linearUserEmail: string | null;
        estimateField: string | null;
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
        new Request('https://dummy/linear/oauth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken, refreshToken, expiresAt }),
        }) as unknown as CfRequest
      );
    };

    const currentIssue = await fetchLinearIssue(
      credentials,
      issueId,
      onTokenRefresh,
      clientId,
      clientSecret
    );

    if (!currentIssue) {
      return jsonError('Linear issue not found', 404);
    }

    if (currentIssue.storyPoints === estimate) {
      return jsonResponse({ ticket: currentIssue });
    }

    const updatedIssue = await updateLinearEstimate(
      credentials,
      issueId,
      estimate,
      onTokenRefresh,
      clientId,
      clientSecret
    );

    return jsonResponse({ ticket: updatedIssue });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to update Linear estimate';
    const isAuth =
      message.toLowerCase().includes('session') ||
      message.toLowerCase().includes('oauth') ||
      message.toLowerCase().includes('reconnect');
    return jsonError(message, isAuth ? 401 : 500);
  }
}

export async function searchLinearIssuesController(
  url: URL,
  env: Env
): Promise<CfResponse> {
  const roomKey = url.searchParams.get('roomKey');
  const userName = url.searchParams.get('userName');
  const sessionToken = url.searchParams.get('sessionToken');
  const query = url.searchParams.get('query');
  const teamId = url.searchParams.get('teamId');
  const stateId = url.searchParams.get('stateId');
  const assigneeId = url.searchParams.get('assigneeId');
  const first = url.searchParams.get('first');
  const after = url.searchParams.get('after');

  if (!roomKey || !userName) {
    return jsonError('Room key and user name are required');
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const clientId = env.LINEAR_OAUTH_CLIENT_ID;
    const clientSecret = env.LINEAR_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return jsonError('Linear OAuth not configured', 500);
    }

    const roomObject = getRoomStub(env, roomKey);
    const credentialsResponse = await roomObject.fetch(
      new Request('https://dummy/linear/oauth/credentials', {
        method: 'GET',
      }) as unknown as CfRequest
    );

    if (!credentialsResponse.ok) {
      return jsonError(
        'Linear not connected. Please connect your Linear account in settings.',
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
        linearOrganizationId: string | null;
        linearUserId: string | null;
        linearUserEmail: string | null;
        estimateField: string | null;
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
        new Request('https://dummy/linear/oauth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken, refreshToken, expiresAt }),
        }) as unknown as CfRequest
      );
    };

    const result = await searchLinearIssues(
      credentials,
      {
        query: query || undefined,
        teamId: teamId || undefined,
        stateId: stateId || undefined,
        assigneeId: assigneeId || undefined,
        first: first ? parseInt(first, 10) : undefined,
        after: after || undefined,
      },
      onTokenRefresh,
      clientId,
      clientSecret
    );

    return jsonResponse(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to search Linear issues';
    const isAuth =
      message.toLowerCase().includes('session') ||
      message.toLowerCase().includes('oauth') ||
      message.toLowerCase().includes('reconnect');
    return jsonError(message, isAuth ? 401 : 500);
  }
}

export async function importLinearIssuesBatchController(
  request: CfRequest,
  env: Env
): Promise<CfResponse> {
  const body = await request.json<{
    issueIds?: string[];
    roomKey?: string;
    userName?: string;
    sessionToken?: string;
  }>();

  const issueIds = body?.issueIds;
  const roomKey = body?.roomKey;
  const userName = body?.userName;
  const sessionToken = body?.sessionToken;

  if (!issueIds || issueIds.length === 0) {
    return jsonError('Issue IDs are required');
  }

  if (!roomKey || !userName) {
    return jsonError('Room key and user name are required');
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const clientId = env.LINEAR_OAUTH_CLIENT_ID;
    const clientSecret = env.LINEAR_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return jsonError('Linear OAuth not configured', 500);
    }

    const roomObject = getRoomStub(env, roomKey);
    const credentialsResponse = await roomObject.fetch(
      new Request('https://dummy/linear/oauth/credentials', {
        method: 'GET',
      }) as unknown as CfRequest
    );

    if (!credentialsResponse.ok) {
      return jsonError(
        'Linear not connected. Please connect your Linear account in settings.',
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
        linearOrganizationId: string | null;
        linearUserId: string | null;
        linearUserEmail: string | null;
        estimateField: string | null;
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
        new Request('https://dummy/linear/oauth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken, refreshToken, expiresAt }),
        }) as unknown as CfRequest
      );
    };

    const tickets = await fetchLinearIssuesBatch(
      credentials,
      issueIds,
      onTokenRefresh,
      clientId,
      clientSecret
    );

    return jsonResponse({ tickets });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to import Linear issues batch';
    const isAuth =
      message.toLowerCase().includes('session') ||
      message.toLowerCase().includes('oauth') ||
      message.toLowerCase().includes('reconnect');
    return jsonError(message, isAuth ? 401 : 500);
  }
}

export async function getLinearTeamsController(
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

    const clientId = env.LINEAR_OAUTH_CLIENT_ID;
    const clientSecret = env.LINEAR_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return jsonError('Linear OAuth not configured', 500);
    }

    const roomObject = getRoomStub(env, roomKey);
    const credentialsResponse = await roomObject.fetch(
      new Request('https://dummy/linear/oauth/credentials', {
        method: 'GET',
      }) as unknown as CfRequest
    );

    if (!credentialsResponse.ok) {
      return jsonError(
        'Linear not connected. Please connect your Linear account in settings.',
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
        linearOrganizationId: string | null;
        linearUserId: string | null;
        linearUserEmail: string | null;
        estimateField: string | null;
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
        new Request('https://dummy/linear/oauth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken, refreshToken, expiresAt }),
        }) as unknown as CfRequest
      );
    };

    const teams = await getLinearTeams(
      credentials,
      onTokenRefresh,
      clientId,
      clientSecret
    );

    return jsonResponse({ teams });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch Linear teams';
    const isAuth =
      message.toLowerCase().includes('session') ||
      message.toLowerCase().includes('oauth') ||
      message.toLowerCase().includes('reconnect');
    return jsonError(message, isAuth ? 401 : 500);
  }
}
