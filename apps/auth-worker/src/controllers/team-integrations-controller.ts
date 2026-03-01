import type { AuthWorkerEnv, OAuthProvider } from '@sprintjam/types';
import {
  signState,
  verifyState,
  generateID,
  escapeHtml,
} from '@sprintjam/utils';
import {
  findDefaultStoryPointsField,
  findDefaultSprintField,
  getLinearOrganization,
  getLinearViewer,
} from '@sprintjam/services';
import { authenticateRequest, isAuthError, type AuthResult } from '../lib/auth';
import {
  jsonResponse,
  jsonError,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from '../lib/response';
import { TeamIntegrationRepository } from '../repositories/team-integration-repository';
import { TeamRepository } from '../repositories/team-repository';

function getIntegrationRepo(env: AuthWorkerEnv): TeamIntegrationRepository {
  return new TeamIntegrationRepository(env.DB, env.TOKEN_ENCRYPTION_SECRET);
}

async function getAuthOrError(
  request: Request,
  env: AuthWorkerEnv,
): Promise<{ result: AuthResult } | { response: Response }> {
  const result = await authenticateRequest(request, env.DB);
  if (isAuthError(result)) {
    return { response: unauthorizedResponse() };
  }
  return { result };
}

function verifyInternalSecret(request: Request, env: AuthWorkerEnv): boolean {
  const secret = env.INTERNAL_API_SECRET;
  if (!secret) return true;
  const header = request.headers.get('Authorization');
  return header === `Bearer ${secret}`;
}

async function verifyTeamOwnership(
  env: AuthWorkerEnv,
  teamId: number,
  userId: number,
): Promise<boolean> {
  const teamRepo = new TeamRepository(env.DB);
  const team = await teamRepo.getTeamById(teamId);
  return !!team && team.ownerId === userId;
}

function oauthHtmlResponse(
  title: string,
  message: string,
  status: number,
): Response {
  return new Response(
    `<html><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p></body></html>`,
    { status, headers: { 'Content-Type': 'text/html' } },
  );
}

function oauthHtmlError(message: string, status = 400): Response {
  return oauthHtmlResponse('OAuth Error', message, status);
}

function oauthHtmlSuccess(message: string): Response {
  return oauthHtmlResponse('Success!', message, 200);
}

export async function listTeamIntegrationsController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ('response' in auth) return auth.response;

  const { userId, repo } = auth.result;
  const team = await repo.getTeamById(teamId);

  if (!team) return notFoundResponse('Team not found');

  const user = await repo.getUserById(userId);
  if (!user || user.organisationId !== team.organisationId) {
    return forbiddenResponse();
  }

  const integrationRepo = getIntegrationRepo(env);
  const statuses = await integrationRepo.listIntegrationStatuses(teamId);
  return jsonResponse({ integrations: statuses });
}

export async function getTeamIntegrationStatusController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
  provider: OAuthProvider,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ('response' in auth) return auth.response;

  const { userId, repo } = auth.result;
  const team = await repo.getTeamById(teamId);

  if (!team) return notFoundResponse('Team not found');

  const user = await repo.getUserById(userId);
  if (!user || user.organisationId !== team.organisationId) {
    return forbiddenResponse();
  }

  const integrationRepo = getIntegrationRepo(env);
  const statuses = await integrationRepo.listIntegrationStatuses(teamId);
  const status = statuses.find((s) => s.provider === provider) ?? {
    provider,
    connected: false,
  };

  return jsonResponse({ status });
}

export async function initiateTeamOAuthController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
  provider: OAuthProvider,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ('response' in auth) return auth.response;

  const { userId, repo } = auth.result;
  const team = await repo.getTeamById(teamId);

  if (!team) return notFoundResponse('Team not found');

  if (team.ownerId !== userId) {
    return forbiddenResponse('Only the team owner can configure integrations');
  }

  const user = await repo.getUserById(userId);
  if (!user) return notFoundResponse('User not found');

  try {
    const nonce = generateID();

    if (provider === 'jira') {
      const clientId = env.JIRA_OAUTH_CLIENT_ID;
      const clientSecret = env.JIRA_OAUTH_CLIENT_SECRET;
      const redirectUri =
        env.JIRA_OAUTH_REDIRECT_URI ||
        'https://sprintjam.co.uk/api/teams/integrations/jira/callback';

      if (!clientId || !clientSecret) {
        return jsonError(
          'Jira OAuth not configured. Please contact administrator.',
          500,
        );
      }

      const state = await signState(
        { teamId, userId, authorizedBy: user.email, nonce },
        clientSecret,
      );

      const authUrl = new URL('https://auth.atlassian.com/authorize');
      authUrl.searchParams.set('audience', 'api.atlassian.com');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set(
        'scope',
        'read:jira-work write:jira-work read:board-scope:jira-software read:project:jira read:sprint:jira-software read:issue-details:jira read:jql:jira read:jira-user offline_access',
      );
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('prompt', 'consent');

      return jsonResponse({ authorizationUrl: authUrl.toString() });
    }

    if (provider === 'linear') {
      const clientId = env.LINEAR_OAUTH_CLIENT_ID;
      const clientSecret = env.LINEAR_OAUTH_CLIENT_SECRET;
      const redirectUri =
        env.LINEAR_OAUTH_REDIRECT_URI ||
        'https://sprintjam.co.uk/api/teams/integrations/linear/callback';

      if (!clientId || !clientSecret) {
        return jsonError(
          'Linear OAuth not configured. Please contact administrator.',
          500,
        );
      }

      const state = await signState(
        { teamId, userId, authorizedBy: user.email, nonce },
        clientSecret,
      );

      const authUrl = new URL('https://linear.app/oauth/authorize');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'read,write');
      authUrl.searchParams.set('state', state);

      return jsonResponse({ authorizationUrl: authUrl.toString() });
    }

    if (provider === 'github') {
      const clientId = env.GITHUB_OAUTH_CLIENT_ID;
      const clientSecret = env.GITHUB_OAUTH_CLIENT_SECRET;
      const redirectUri =
        env.GITHUB_OAUTH_REDIRECT_URI ||
        'https://sprintjam.co.uk/api/teams/integrations/github/callback';

      if (!clientId || !clientSecret) {
        return jsonError(
          'GitHub OAuth not configured. Please contact administrator.',
          500,
        );
      }

      const state = await signState(
        { teamId, userId, authorizedBy: user.email, nonce },
        clientSecret,
      );

      const authUrl = new URL('https://github.com/login/oauth/authorize');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('scope', 'repo read:user user:email');

      return jsonResponse({ authorizationUrl: authUrl.toString() });
    }

    return jsonError('Unknown provider', 400);
  } catch (error) {
    console.error('Failed to initiate OAuth:', error);
    return jsonError('Failed to initiate OAuth', 500);
  }
}

export async function handleJiraTeamOAuthCallbackController(
  url: URL,
  env: AuthWorkerEnv,
): Promise<Response> {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) return oauthHtmlError(error, 400);
  if (!code || !state) return oauthHtmlError('Missing code or state', 400);

  const clientId = env.JIRA_OAUTH_CLIENT_ID;
  const clientSecret = env.JIRA_OAUTH_CLIENT_SECRET;
  const redirectUri =
    env.JIRA_OAUTH_REDIRECT_URI ||
    'https://sprintjam.co.uk/api/teams/integrations/jira/callback';

  if (!clientId || !clientSecret)
    return oauthHtmlError('OAuth not configured', 500);

  try {
    const stateData = (await verifyState(state, clientSecret)) as {
      teamId: number;
      userId: number;
      authorizedBy: string;
      nonce: string;
    };
    const { teamId, userId, authorizedBy } = stateData;

    const stillOwner = await verifyTeamOwnership(env, teamId, userId);
    if (!stillOwner) {
      return oauthHtmlError(
        'Team ownership has changed. Please try again.',
        403,
      );
    }

    const tokenResponse = await fetch(
      'https://auth.atlassian.com/oauth/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      },
    );

    if (!tokenResponse.ok) {
      console.error('Jira token exchange failed:', tokenResponse.status);
      return oauthHtmlError('Failed to exchange code for token', 500);
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
      },
    );

    if (!resourcesResponse.ok) {
      return oauthHtmlError('Failed to fetch Jira resources', 500);
    }

    const resources = await resourcesResponse.json<
      Array<{
        id: string;
        url: string;
        name: string;
        scopes: string[];
      }>
    >();

    if (resources.length === 0)
      return oauthHtmlError('No Jira sites accessible', 400);

    const requiredScopes = [
      'read:board-scope:jira-software',
      'read:sprint:jira-software',
      'read:issue-details:jira',
    ];
    const jiraResource =
      resources.find((r) =>
        requiredScopes.every((s) => r.scopes.includes(s)),
      ) ?? resources[0];
    const jiraDomain = new URL(jiraResource.url).hostname;

    const userResponse = await fetch(
      `https://api.atlassian.com/ex/jira/${jiraResource.id}/rest/api/3/myself`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/json',
        },
      },
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
        },
      );
      if (fieldsResponse.ok) {
        const fields = await fieldsResponse.json<
          Array<{
            id: string;
            name: string;
            schema?: { type?: string; system?: string; custom?: string };
          }>
        >();
        storyPointsField = findDefaultStoryPointsField(fields);
        sprintField = findDefaultSprintField(fields);
      }
    } catch (fieldError) {
      console.error('Failed to pre-select Jira fields', fieldError);
    }

    const integrationRepo = getIntegrationRepo(env);
    await integrationRepo.saveJiraCredentials({
      teamId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      tokenType: tokenData.token_type,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
      scope: tokenData.scope,
      authorizedBy,
      jiraDomain,
      jiraCloudId: jiraResource.id,
      jiraUserId,
      jiraUserEmail,
      storyPointsField,
      sprintField,
    });

    return oauthHtmlSuccess(
      'Jira connected successfully. You can close this window.',
    );
  } catch (error) {
    console.error('Jira team OAuth callback error:', error);
    return oauthHtmlError(
      'An error occurred during Jira authorization. Please try again.',
      500,
    );
  }
}

export async function handleLinearTeamOAuthCallbackController(
  url: URL,
  env: AuthWorkerEnv,
): Promise<Response> {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) return oauthHtmlError(error, 400);
  if (!code || !state) return oauthHtmlError('Missing code or state', 400);

  const clientId = env.LINEAR_OAUTH_CLIENT_ID;
  const clientSecret = env.LINEAR_OAUTH_CLIENT_SECRET;
  const redirectUri =
    env.LINEAR_OAUTH_REDIRECT_URI ||
    'https://sprintjam.co.uk/api/teams/integrations/linear/callback';

  if (!clientId || !clientSecret)
    return oauthHtmlError('OAuth not configured', 500);

  try {
    const stateData = (await verifyState(state, clientSecret)) as {
      teamId: number;
      userId: number;
      authorizedBy: string;
      nonce: string;
    };
    const { teamId, userId, authorizedBy } = stateData;

    const stillOwner = await verifyTeamOwnership(env, teamId, userId);
    if (!stillOwner) {
      return oauthHtmlError(
        'Team ownership has changed. Please try again.',
        403,
      );
    }

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch('https://api.linear.app/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!tokenResponse.ok) {
      console.error('Linear token exchange failed:', tokenResponse.status);
      return oauthHtmlError('Failed to exchange code for token', 500);
    }

    const tokenData = await tokenResponse.json<{
      access_token: string;
      token_type: string;
      expires_in?: number;
      scope?: string;
    }>();

    const expiresAt =
      Date.now() + (tokenData.expires_in ?? 90 * 24 * 60 * 60) * 1000;

    let linearOrganizationId: string | null = null;
    let linearUserId: string | null = null;
    let linearUserEmail: string | null = null;

    try {
      const [org, viewer] = await Promise.all([
        getLinearOrganization(tokenData.access_token),
        getLinearViewer(tokenData.access_token),
      ]);
      linearOrganizationId = org?.id ?? null;
      linearUserId = viewer?.id ?? null;
      linearUserEmail = viewer?.email ?? null;
    } catch (profileError) {
      console.error('Failed to fetch Linear profile', profileError);
    }

    const integrationRepo = getIntegrationRepo(env);
    await integrationRepo.saveLinearCredentials({
      teamId,
      accessToken: tokenData.access_token,
      refreshToken: null,
      tokenType: tokenData.token_type,
      expiresAt,
      scope: tokenData.scope ?? null,
      authorizedBy,
      linearOrganizationId,
      linearUserId,
      linearUserEmail,
      estimateField: null,
    });

    return oauthHtmlSuccess(
      'Linear connected successfully. You can close this window.',
    );
  } catch (error) {
    console.error('Linear team OAuth callback error:', error);
    return oauthHtmlError(
      'An error occurred during Linear authorization. Please try again.',
      500,
    );
  }
}

export async function handleGithubTeamOAuthCallbackController(
  url: URL,
  env: AuthWorkerEnv,
): Promise<Response> {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) return oauthHtmlError(error, 400);
  if (!code || !state) return oauthHtmlError('Missing code or state', 400);

  const clientId = env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = env.GITHUB_OAUTH_CLIENT_SECRET;
  const redirectUri =
    env.GITHUB_OAUTH_REDIRECT_URI ||
    'https://sprintjam.co.uk/api/teams/integrations/github/callback';

  if (!clientId || !clientSecret)
    return oauthHtmlError('OAuth not configured', 500);

  try {
    const stateData = (await verifyState(state, clientSecret)) as {
      teamId: number;
      userId: number;
      authorizedBy: string;
      nonce: string;
    };
    const { teamId, userId, authorizedBy } = stateData;

    const stillOwner = await verifyTeamOwnership(env, teamId, userId);
    if (!stillOwner) {
      return oauthHtmlError(
        'Team ownership has changed. Please try again.',
        403,
      );
    }

    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      },
    );

    if (!tokenResponse.ok) {
      console.error('GitHub token exchange failed:', tokenResponse.status);
      return oauthHtmlError('Failed to exchange code for token', 500);
    }

    const tokenData = await tokenResponse.json<{
      access_token: string;
      token_type: string;
      scope?: string;
      error?: string;
    }>();

    if (tokenData.error) {
      return oauthHtmlError(tokenData.error, 400);
    }

    let githubLogin: string | null = null;
    let githubUserEmail: string | null = null;

    try {
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/vnd.github+json',
        },
      });
      if (userResponse.ok) {
        const userData = await userResponse.json<{
          login: string;
          email?: string | null;
        }>();
        githubLogin = userData.login ?? null;
        githubUserEmail = userData.email ?? null;
      }
    } catch (profileError) {
      console.error('Failed to fetch GitHub user profile', profileError);
    }

    const integrationRepo = getIntegrationRepo(env);
    await integrationRepo.saveGithubCredentials({
      teamId,
      accessToken: tokenData.access_token,
      refreshToken: null,
      tokenType: tokenData.token_type,
      expiresAt: Date.now() + 90 * 24 * 60 * 60 * 1000,
      scope: tokenData.scope ?? null,
      authorizedBy,
      githubLogin,
      githubUserEmail,
      defaultOwner: null,
      defaultRepo: null,
    });

    return oauthHtmlSuccess(
      'GitHub connected successfully. You can close this window.',
    );
  } catch (error) {
    console.error('GitHub team OAuth callback error:', error);
    return oauthHtmlError(
      'An error occurred during GitHub authorization. Please try again.',
      500,
    );
  }
}

export async function revokeTeamIntegrationController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
  provider: OAuthProvider,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ('response' in auth) return auth.response;

  const { userId, repo } = auth.result;
  const team = await repo.getTeamById(teamId);

  if (!team) return notFoundResponse('Team not found');

  if (team.ownerId !== userId) {
    return forbiddenResponse('Only the team owner can revoke integrations');
  }

  const integrationRepo = getIntegrationRepo(env);
  await integrationRepo.deleteIntegration(teamId, provider);
  return jsonResponse({ success: true });
}

export async function getTeamCredentialsInternalController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  if (!verifyInternalSecret(request, env)) {
    return jsonError('Unauthorized', 401);
  }

  let body: { teamId?: number; provider?: OAuthProvider };
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid request body', 400);
  }

  const { teamId, provider } = body;
  if (typeof teamId !== 'number' || !provider) {
    return jsonError('teamId and provider are required', 400);
  }

  const integrationRepo = getIntegrationRepo(env);

  let credentials = null;
  if (provider === 'jira') {
    credentials = await integrationRepo.getJiraCredentials(teamId);
  } else if (provider === 'linear') {
    credentials = await integrationRepo.getLinearCredentials(teamId);
  } else if (provider === 'github') {
    credentials = await integrationRepo.getGithubCredentials(teamId);
  } else {
    return jsonError('Unknown provider', 400);
  }

  if (!credentials) {
    return new Response(JSON.stringify({ error: 'Not connected' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ credentials }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function refreshTeamCredentialsInternalController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  if (!verifyInternalSecret(request, env)) {
    return jsonError('Unauthorized', 401);
  }

  let body: {
    teamId?: number;
    provider?: OAuthProvider;
    accessToken?: string;
    refreshToken?: string | null;
    expiresAt?: number;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid request body', 400);
  }

  const { teamId, provider, accessToken, refreshToken, expiresAt } = body;
  if (
    typeof teamId !== 'number' ||
    !provider ||
    typeof accessToken !== 'string' ||
    typeof expiresAt !== 'number'
  ) {
    return jsonError(
      'teamId, provider, accessToken, and expiresAt are required',
      400,
    );
  }

  const integrationRepo = getIntegrationRepo(env);
  await integrationRepo.updateTokens(
    teamId,
    provider,
    accessToken,
    refreshToken ?? null,
    expiresAt,
  );

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
