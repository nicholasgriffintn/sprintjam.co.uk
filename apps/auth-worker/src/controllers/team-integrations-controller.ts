import type { AuthWorkerEnv, OAuthProvider } from "@sprintjam/types";
import {
  signState,
  verifyState,
  generateID,
  escapeHtml,
  hashToken,
} from "@sprintjam/utils";
import {
  fetchGithubMilestones,
  fetchGithubRepoIssues,
  fetchGithubRepos,
  fetchJiraBoardIssues,
  fetchJiraBoards,
  fetchJiraSprints,
  fetchLinearCycles,
  fetchLinearIssues,
  fetchLinearTeams,
  findDefaultStoryPointsField,
  findDefaultSprintField,
  getLinearOrganization,
  getLinearViewer,
} from "@sprintjam/services";
import { authenticateRequest, isAuthError, type AuthResult } from "../lib/auth";
import {
  jsonResponse,
  jsonError,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from "../lib/response";
import { AUTH_CHALLENGE_EXPIRY_MS } from "../constants";
import { TeamIntegrationRepository } from "../repositories/team-integration-repository";
import { TeamRepository } from "../repositories/team-repository";
import { WorkspaceAuthRepository } from "../repositories/workspace-auth";
import { canAccessTeam, canManageTeam } from "../lib/team-access";

type TeamOAuthState = {
  teamId: number;
  userId: number;
  nonce: string;
};

type TeamOAuthChallengeMetadata = {
  teamId: number;
  authorizedBy: string;
};

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
  if (!secret) return false;
  const header = request.headers.get("Authorization");
  if (!header) return false;
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < header.length; i++) {
    mismatch |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

async function verifyTeamAdminAccess(
  env: AuthWorkerEnv,
  teamId: number,
  userId: number,
): Promise<boolean> {
  const teamRepo = new TeamRepository(env.DB);
  if (await teamRepo.isTeamAdmin(teamId, userId)) {
    return true;
  }

  const team = await teamRepo.getTeamById(teamId);
  if (!team) {
    return false;
  }

  const authRepo = new WorkspaceAuthRepository(env.DB);
  return authRepo.isOrganisationAdmin(userId, team.organisationId);
}

async function canUserAccessTeam(
  repo: AuthResult["repo"],
  userId: number,
  teamId: number,
): Promise<boolean> {
  const team = await repo.getTeamById(teamId);
  if (!team) {
    return false;
  }

  const user = await repo.getUserById(userId);
  if (!user || user.organisationId !== team.organisationId) {
    return false;
  }

  const isWorkspaceAdmin = await repo.isOrganisationAdmin(
    userId,
    user.organisationId,
  );
  const membership = await repo.getTeamMembership(teamId, userId);
  return canAccessTeam(team, membership, userId, isWorkspaceAdmin);
}

async function canUserManageTeam(
  repo: AuthResult["repo"],
  userId: number,
  teamId: number,
): Promise<boolean> {
  const team = await repo.getTeamById(teamId);
  if (!team) {
    return false;
  }

  const user = await repo.getUserById(userId);
  if (!user || user.organisationId !== team.organisationId) {
    return false;
  }

  const isWorkspaceAdmin = await repo.isOrganisationAdmin(
    userId,
    user.organisationId,
  );
  const membership = await repo.getTeamMembership(teamId, userId);
  return canManageTeam(team, membership, userId, isWorkspaceAdmin);
}

function oauthHtmlResponse(
  title: string,
  message: string,
  status: number,
  autoClose = false,
): Response {
  const closeScript = autoClose
    ? "<script>setTimeout(function(){window.close()},1500)</script>"
    : "";
  return new Response(
    `<html><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>${closeScript}</body></html>`,
    { status, headers: { "Content-Type": "text/html" } },
  );
}

function oauthHtmlError(message: string, status = 400): Response {
  return oauthHtmlResponse("OAuth Error", message, status);
}

function oauthHtmlSuccess(message: string): Response {
  return oauthHtmlResponse("Success!", message, 200, true);
}

async function createSignedTeamOAuthState(
  repo: AuthResult["repo"],
  userId: number,
  teamId: number,
  authorizedBy: string,
  signingSecret: string,
): Promise<string> {
  const nonce = generateID();
  const nonceHash = await hashToken(nonce);
  await repo.createAuthChallenge({
    userId,
    tokenHash: nonceHash,
    type: "oauth",
    metadata: JSON.stringify({
      teamId,
      authorizedBy,
    } satisfies TeamOAuthChallengeMetadata),
    expiresAt: Date.now() + AUTH_CHALLENGE_EXPIRY_MS,
  });

  return signState(
    { teamId, userId, nonce } satisfies TeamOAuthState,
    signingSecret,
  );
}

async function consumeOAuthNonce(
  env: AuthWorkerEnv,
  stateData: TeamOAuthState,
): Promise<TeamOAuthChallengeMetadata | null> {
  const authRepo = new WorkspaceAuthRepository(env.DB);
  const nonceHash = await hashToken(stateData.nonce);
  const challenge = await authRepo.getAuthChallengeByTokenHash(nonceHash);

  if (
    !challenge ||
    challenge.userId !== stateData.userId ||
    challenge.type !== "oauth" ||
    challenge.usedAt ||
    challenge.expiresAt < Date.now()
  ) {
    return null;
  }

  let metadata: TeamOAuthChallengeMetadata | null = null;
  try {
    metadata = challenge.metadata
      ? (JSON.parse(challenge.metadata) as TeamOAuthChallengeMetadata)
      : null;
  } catch {
    return null;
  }

  if (
    !metadata ||
    metadata.teamId !== stateData.teamId ||
    typeof metadata.authorizedBy !== "string" ||
    metadata.authorizedBy.trim().length === 0
  ) {
    return null;
  }

  await authRepo.markAuthChallengeUsed(challenge.id);
  return {
    teamId: metadata.teamId,
    authorizedBy: metadata.authorizedBy.trim(),
  };
}

export async function listTeamIntegrationsController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) return auth.response;

  const { userId, repo } = auth.result;
  if (!(await canUserAccessTeam(repo, userId, teamId))) {
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
  if ("response" in auth) return auth.response;

  const { userId, repo } = auth.result;
  if (!(await canUserAccessTeam(repo, userId, teamId))) {
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

function getJiraOAuthConfig(env: AuthWorkerEnv) {
  if (!env.JIRA_OAUTH_CLIENT_ID || !env.JIRA_OAUTH_CLIENT_SECRET) {
    return null;
  }

  return {
    clientId: env.JIRA_OAUTH_CLIENT_ID,
    clientSecret: env.JIRA_OAUTH_CLIENT_SECRET,
  };
}

function getLinearOAuthConfig(env: AuthWorkerEnv) {
  if (!env.LINEAR_OAUTH_CLIENT_ID || !env.LINEAR_OAUTH_CLIENT_SECRET) {
    return null;
  }

  return {
    clientId: env.LINEAR_OAUTH_CLIENT_ID,
    clientSecret: env.LINEAR_OAUTH_CLIENT_SECRET,
  };
}

async function requireTeamAccess(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<
  | { integrationRepo: TeamIntegrationRepository; repo: AuthResult["repo"] }
  | { response: Response }
> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) {
    return { response: auth.response };
  }

  const { userId, repo } = auth.result;
  if (!(await canUserAccessTeam(repo, userId, teamId))) {
    return { response: forbiddenResponse() };
  }

  return {
    integrationRepo: getIntegrationRepo(env),
    repo,
  };
}

function isSupportedProvider(
  provider: OAuthProvider,
): provider is "jira" | "linear" | "github" {
  return provider === "jira" || provider === "linear" || provider === "github";
}

function parseOptionalLimit(limit: unknown): number | null {
  if (limit === undefined || limit === null || limit === "") {
    return null;
  }

  const parsed = Number(limit);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.min(Math.floor(parsed), 100);
}

async function getTeamJiraCredentials(
  env: AuthWorkerEnv,
  integrationRepo: TeamIntegrationRepository,
  teamId: number,
) {
  const credentials = await integrationRepo.getJiraCredentials(teamId);
  if (!credentials) {
    throw new Error("Jira is not connected for this team.");
  }

  const oauthConfig = getJiraOAuthConfig(env);
  if (!oauthConfig) {
    throw new Error("Jira OAuth is not configured.");
  }

  return {
    credentials,
    oauthConfig,
    onTokenRefresh: async (
      accessToken: string,
      refreshToken: string,
      expiresAt: number,
    ) => {
      await integrationRepo.updateTokens(
        teamId,
        "jira",
        accessToken,
        refreshToken,
        expiresAt,
      );
    },
  };
}

async function getTeamLinearCredentials(
  env: AuthWorkerEnv,
  integrationRepo: TeamIntegrationRepository,
  teamId: number,
) {
  const credentials = await integrationRepo.getLinearCredentials(teamId);
  if (!credentials) {
    throw new Error("Linear is not connected for this team.");
  }

  const oauthConfig = getLinearOAuthConfig(env);
  if (!oauthConfig) {
    throw new Error("Linear OAuth is not configured.");
  }

  return {
    credentials,
    oauthConfig,
    onTokenRefresh: async (
      accessToken: string,
      refreshToken: string | null,
      expiresAt: number,
    ) => {
      await integrationRepo.updateTokens(
        teamId,
        "linear",
        accessToken,
        refreshToken,
        expiresAt,
      );
    },
  };
}

async function getTeamGithubCredentials(
  integrationRepo: TeamIntegrationRepository,
  teamId: number,
) {
  const credentials = await integrationRepo.getGithubCredentials(teamId);
  if (!credentials) {
    throw new Error("GitHub is not connected for this team.");
  }

  return credentials;
}

export async function listTeamIntegrationBoardsController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
  provider: OAuthProvider,
): Promise<Response> {
  if (!isSupportedProvider(provider)) {
    return jsonError("Unknown provider", 400);
  }

  const access = await requireTeamAccess(request, env, teamId);
  if ("response" in access) {
    return access.response;
  }

  try {
    if (provider === "jira") {
      const { credentials, oauthConfig, onTokenRefresh } =
        await getTeamJiraCredentials(env, access.integrationRepo, teamId);
      const boards = await fetchJiraBoards(
        credentials,
        onTokenRefresh,
        oauthConfig.clientId,
        oauthConfig.clientSecret,
      );
      return jsonResponse({
        boards: boards.map((board) => ({
          id: board.id,
          name: board.name,
        })),
      });
    }

    if (provider === "linear") {
      const { credentials, oauthConfig, onTokenRefresh } =
        await getTeamLinearCredentials(env, access.integrationRepo, teamId);
      const teams = await fetchLinearTeams(
        credentials,
        onTokenRefresh,
        oauthConfig.clientId,
        oauthConfig.clientSecret,
      );
      return jsonResponse({
        boards: teams.map((team) => ({
          id: team.id,
          name: team.name,
          key: team.key,
        })),
      });
    }

    const credentials = await getTeamGithubCredentials(
      access.integrationRepo,
      teamId,
    );
    const repos = await fetchGithubRepos(credentials);
    return jsonResponse({
      boards: repos.map((repo) => ({
        id: repo.fullName,
        name: repo.fullName,
        key: repo.name,
      })),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to fetch integration boards",
      400,
    );
  }
}

export async function listTeamIntegrationSprintsController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
  provider: OAuthProvider,
): Promise<Response> {
  if (!isSupportedProvider(provider)) {
    return jsonError("Unknown provider", 400);
  }

  const access = await requireTeamAccess(request, env, teamId);
  if ("response" in access) {
    return access.response;
  }

  let body: { boardId?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body", 400);
  }

  const boardId = body.boardId?.trim();
  if (!boardId) {
    return jsonError("boardId is required", 400);
  }

  try {
    if (provider === "jira") {
      const { credentials, oauthConfig, onTokenRefresh } =
        await getTeamJiraCredentials(env, access.integrationRepo, teamId);
      const sprints = await fetchJiraSprints(
        credentials,
        boardId,
        onTokenRefresh,
        oauthConfig.clientId,
        oauthConfig.clientSecret,
      );
      return jsonResponse({ sprints });
    }

    if (provider === "linear") {
      const { credentials, oauthConfig, onTokenRefresh } =
        await getTeamLinearCredentials(env, access.integrationRepo, teamId);
      const cycles = await fetchLinearCycles(
        credentials,
        boardId,
        onTokenRefresh,
        oauthConfig.clientId,
        oauthConfig.clientSecret,
      );
      return jsonResponse({
        sprints: cycles.map((cycle) => ({
          id: cycle.id,
          name: cycle.name || `Cycle ${cycle.number}`,
          number: cycle.number,
          startDate: cycle.startsAt ?? null,
          endDate: cycle.endsAt ?? null,
        })),
      });
    }

    const credentials = await getTeamGithubCredentials(
      access.integrationRepo,
      teamId,
    );
    const milestones = await fetchGithubMilestones(credentials, boardId);
    return jsonResponse({
      sprints: milestones.map((milestone) => ({
        id: String(milestone.number),
        name: milestone.title,
        number: milestone.number,
        state: milestone.state,
      })),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to fetch integration sprints",
      400,
    );
  }
}

export async function searchTeamIntegrationTicketsController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
  provider: OAuthProvider,
): Promise<Response> {
  if (!isSupportedProvider(provider)) {
    return jsonError("Unknown provider", 400);
  }

  const access = await requireTeamAccess(request, env, teamId);
  if ("response" in access) {
    return access.response;
  }

  let body: {
    boardId?: string;
    sprintId?: string;
    sprintName?: string;
    sprintNumber?: number;
    query?: string;
    limit?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body", 400);
  }

  const boardId = body.boardId?.trim();
  if (!boardId) {
    return jsonError("boardId is required", 400);
  }

  const sprintId = body.sprintId?.trim() || null;
  const sprintName = body.sprintName?.trim() || null;
  const sprintNumber =
    typeof body.sprintNumber === "number" ? body.sprintNumber : null;
  const query = body.query?.trim() || null;
  const limit = parseOptionalLimit(body.limit);

  try {
    if (provider === "jira") {
      const { credentials, oauthConfig, onTokenRefresh } =
        await getTeamJiraCredentials(env, access.integrationRepo, teamId);
      const tickets = await fetchJiraBoardIssues(
        credentials,
        boardId,
        {
          sprintId,
          limit,
          search: query,
        },
        onTokenRefresh,
        oauthConfig.clientId,
        oauthConfig.clientSecret,
      );
      return jsonResponse({ tickets });
    }

    if (provider === "linear") {
      const { credentials, oauthConfig, onTokenRefresh } =
        await getTeamLinearCredentials(env, access.integrationRepo, teamId);
      const tickets = await fetchLinearIssues(
        credentials,
        boardId,
        {
          cycleId: sprintId,
          limit,
          search: query,
        },
        onTokenRefresh,
        oauthConfig.clientId,
        oauthConfig.clientSecret,
      );
      return jsonResponse({ tickets });
    }

    const credentials = await getTeamGithubCredentials(
      access.integrationRepo,
      teamId,
    );
    const tickets = await fetchGithubRepoIssues(credentials, boardId, {
      milestoneNumber: sprintNumber,
      milestoneTitle: sprintName,
      limit,
      search: query,
    });
    return jsonResponse({ tickets });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to search integration tickets",
      400,
    );
  }
}

export async function initiateTeamOAuthController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
  provider: OAuthProvider,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) return auth.response;

  const { userId, repo } = auth.result;
  const team = await repo.getTeamById(teamId);

  if (!team) return notFoundResponse("Team not found");

  if (!(await canUserManageTeam(repo, userId, teamId))) {
    return forbiddenResponse("Only team admins can configure integrations");
  }

  const user = await repo.getUserById(userId);
  if (!user) return notFoundResponse("User not found");

  try {
    if (provider === "jira") {
      const clientId = env.JIRA_OAUTH_CLIENT_ID;
      const clientSecret = env.JIRA_OAUTH_CLIENT_SECRET;
      const redirectUri =
        env.JIRA_OAUTH_REDIRECT_URI ||
        "https://sprintjam.co.uk/api/teams/integrations/jira/callback";

      if (!clientId || !clientSecret) {
        return jsonError(
          "Jira OAuth not configured. Please contact administrator.",
          500,
        );
      }

      const state = await createSignedTeamOAuthState(
        repo,
        userId,
        teamId,
        user.email,
        clientSecret,
      );

      const authUrl = new URL("https://auth.atlassian.com/authorize");
      authUrl.searchParams.set("audience", "api.atlassian.com");
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set(
        "scope",
        "read:jira-work write:jira-work read:board-scope:jira-software read:project:jira read:sprint:jira-software read:issue-details:jira read:jql:jira read:jira-user offline_access",
      );
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("prompt", "consent");

      return jsonResponse({ authorizationUrl: authUrl.toString() });
    }

    if (provider === "linear") {
      const clientId = env.LINEAR_OAUTH_CLIENT_ID;
      const clientSecret = env.LINEAR_OAUTH_CLIENT_SECRET;
      const redirectUri =
        env.LINEAR_OAUTH_REDIRECT_URI ||
        "https://sprintjam.co.uk/api/teams/integrations/linear/callback";

      if (!clientId || !clientSecret) {
        return jsonError(
          "Linear OAuth not configured. Please contact administrator.",
          500,
        );
      }

      const state = await createSignedTeamOAuthState(
        repo,
        userId,
        teamId,
        user.email,
        clientSecret,
      );

      const authUrl = new URL("https://linear.app/oauth/authorize");
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "read,write");
      authUrl.searchParams.set("state", state);

      return jsonResponse({ authorizationUrl: authUrl.toString() });
    }

    if (provider === "github") {
      const clientId = env.GITHUB_OAUTH_CLIENT_ID;
      const clientSecret = env.GITHUB_OAUTH_CLIENT_SECRET;
      const redirectUri =
        env.GITHUB_OAUTH_REDIRECT_URI ||
        "https://sprintjam.co.uk/api/teams/integrations/github/callback";

      if (!clientId || !clientSecret) {
        return jsonError(
          "GitHub OAuth not configured. Please contact administrator.",
          500,
        );
      }

      const state = await createSignedTeamOAuthState(
        repo,
        userId,
        teamId,
        user.email,
        clientSecret,
      );

      const authUrl = new URL("https://github.com/login/oauth/authorize");
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("scope", "repo read:user user:email");

      return jsonResponse({ authorizationUrl: authUrl.toString() });
    }

    return jsonError("Unknown provider", 400);
  } catch (error) {
    console.error("Failed to initiate OAuth:", error);
    return jsonError("Failed to initiate OAuth", 500);
  }
}

export async function handleJiraTeamOAuthCallbackController(
  url: URL,
  env: AuthWorkerEnv,
): Promise<Response> {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return oauthHtmlError(error, 400);
  if (!code || !state) return oauthHtmlError("Missing code or state", 400);

  const clientId = env.JIRA_OAUTH_CLIENT_ID;
  const clientSecret = env.JIRA_OAUTH_CLIENT_SECRET;
  const redirectUri =
    env.JIRA_OAUTH_REDIRECT_URI ||
    "https://sprintjam.co.uk/api/teams/integrations/jira/callback";

  if (!clientId || !clientSecret)
    return oauthHtmlError("OAuth not configured", 500);

  try {
    const stateData = (await verifyState(
      state,
      clientSecret,
    )) as TeamOAuthState;
    const { teamId, userId } = stateData;

    const stillAdmin = await verifyTeamAdminAccess(env, teamId, userId);
    if (!stillAdmin) {
      return oauthHtmlError("Team access has changed. Please try again.", 403);
    }
    const oauthChallenge = await consumeOAuthNonce(env, stateData);
    if (!oauthChallenge) {
      return oauthHtmlError(
        "Invalid OAuth state. Please retry connection.",
        400,
      );
    }
    const { authorizedBy } = oauthChallenge;

    const tokenResponse = await fetch(
      "https://auth.atlassian.com/oauth/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      },
    );

    if (!tokenResponse.ok) {
      console.error("Jira token exchange failed:", tokenResponse.status);
      return oauthHtmlError("Failed to exchange code for token", 500);
    }

    const tokenData = await tokenResponse.json<{
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
      scope: string;
    }>();

    const resourcesResponse = await fetch(
      "https://api.atlassian.com/oauth/token/accessible-resources",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/json",
        },
      },
    );

    if (!resourcesResponse.ok) {
      return oauthHtmlError("Failed to fetch Jira resources", 500);
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
      return oauthHtmlError("No Jira sites accessible", 400);

    const requiredScopes = [
      "read:board-scope:jira-software",
      "read:sprint:jira-software",
      "read:issue-details:jira",
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
          Accept: "application/json",
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
            Accept: "application/json",
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
      console.error("Failed to pre-select Jira fields", fieldError);
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
      "Jira connected successfully. You can close this window.",
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid state") {
      return oauthHtmlError(
        "Invalid OAuth state. Please retry connection.",
        400,
      );
    }
    console.error("Jira team OAuth callback error:", error);
    return oauthHtmlError(
      "An error occurred during Jira authorization. Please try again.",
      500,
    );
  }
}

export async function handleLinearTeamOAuthCallbackController(
  url: URL,
  env: AuthWorkerEnv,
): Promise<Response> {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return oauthHtmlError(error, 400);
  if (!code || !state) return oauthHtmlError("Missing code or state", 400);

  const clientId = env.LINEAR_OAUTH_CLIENT_ID;
  const clientSecret = env.LINEAR_OAUTH_CLIENT_SECRET;
  const redirectUri =
    env.LINEAR_OAUTH_REDIRECT_URI ||
    "https://sprintjam.co.uk/api/teams/integrations/linear/callback";

  if (!clientId || !clientSecret)
    return oauthHtmlError("OAuth not configured", 500);

  try {
    const stateData = (await verifyState(
      state,
      clientSecret,
    )) as TeamOAuthState;
    const { teamId, userId } = stateData;

    const stillAdmin = await verifyTeamAdminAccess(env, teamId, userId);
    if (!stillAdmin) {
      return oauthHtmlError("Team access has changed. Please try again.", 403);
    }
    const oauthChallenge = await consumeOAuthNonce(env, stateData);
    if (!oauthChallenge) {
      return oauthHtmlError(
        "Invalid OAuth state. Please retry connection.",
        400,
      );
    }
    const { authorizedBy } = oauthChallenge;

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch("https://api.linear.app/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!tokenResponse.ok) {
      console.error("Linear token exchange failed:", tokenResponse.status);
      return oauthHtmlError("Failed to exchange code for token", 500);
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
      console.error("Failed to fetch Linear profile", profileError);
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
      "Linear connected successfully. You can close this window.",
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid state") {
      return oauthHtmlError(
        "Invalid OAuth state. Please retry connection.",
        400,
      );
    }
    console.error("Linear team OAuth callback error:", error);
    return oauthHtmlError(
      "An error occurred during Linear authorization. Please try again.",
      500,
    );
  }
}

export async function handleGithubTeamOAuthCallbackController(
  url: URL,
  env: AuthWorkerEnv,
): Promise<Response> {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return oauthHtmlError(error, 400);
  if (!code || !state) return oauthHtmlError("Missing code or state", 400);

  const clientId = env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = env.GITHUB_OAUTH_CLIENT_SECRET;
  const redirectUri =
    env.GITHUB_OAUTH_REDIRECT_URI ||
    "https://sprintjam.co.uk/api/teams/integrations/github/callback";

  if (!clientId || !clientSecret)
    return oauthHtmlError("OAuth not configured", 500);

  try {
    const stateData = (await verifyState(
      state,
      clientSecret,
    )) as TeamOAuthState;
    const { teamId, userId } = stateData;

    const stillAdmin = await verifyTeamAdminAccess(env, teamId, userId);
    if (!stillAdmin) {
      return oauthHtmlError("Team access has changed. Please try again.", 403);
    }
    const oauthChallenge = await consumeOAuthNonce(env, stateData);
    if (!oauthChallenge) {
      return oauthHtmlError(
        "Invalid OAuth state. Please retry connection.",
        400,
      );
    }
    const { authorizedBy } = oauthChallenge;

    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
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
      console.error("GitHub token exchange failed:", tokenResponse.status);
      return oauthHtmlError("Failed to exchange code for token", 500);
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
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/vnd.github+json",
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
      console.error("Failed to fetch GitHub user profile", profileError);
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
      "GitHub connected successfully. You can close this window.",
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid state") {
      return oauthHtmlError(
        "Invalid OAuth state. Please retry connection.",
        400,
      );
    }
    console.error("GitHub team OAuth callback error:", error);
    return oauthHtmlError(
      "An error occurred during GitHub authorization. Please try again.",
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
  if ("response" in auth) return auth.response;

  const { userId, repo } = auth.result;
  const team = await repo.getTeamById(teamId);

  if (!team) return notFoundResponse("Team not found");

  if (!(await canUserManageTeam(repo, userId, teamId))) {
    return forbiddenResponse("Only team admins can revoke integrations");
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
    return jsonError("Unauthorized", 401);
  }

  let body: { teamId?: number; provider?: OAuthProvider };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body", 400);
  }

  const { teamId, provider } = body;
  if (typeof teamId !== "number" || !provider) {
    return jsonError("teamId and provider are required", 400);
  }

  const integrationRepo = getIntegrationRepo(env);

  let credentials = null;
  if (provider === "jira") {
    credentials = await integrationRepo.getJiraCredentials(teamId);
  } else if (provider === "linear") {
    credentials = await integrationRepo.getLinearCredentials(teamId);
  } else if (provider === "github") {
    credentials = await integrationRepo.getGithubCredentials(teamId);
  } else {
    return jsonError("Unknown provider", 400);
  }

  if (!credentials) {
    return jsonError("Not connected", 404);
  }

  return jsonResponse({ credentials }, { "Cache-Control": "no-store" });
}

export async function refreshTeamCredentialsInternalController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  if (!verifyInternalSecret(request, env)) {
    return jsonError("Unauthorized", 401);
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
    return jsonError("Invalid request body", 400);
  }

  const { teamId, provider, accessToken, refreshToken, expiresAt } = body;
  if (
    typeof teamId !== "number" ||
    !provider ||
    typeof accessToken !== "string" ||
    typeof expiresAt !== "number"
  ) {
    return jsonError(
      "teamId, provider, accessToken, and expiresAt are required",
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

  return jsonResponse({ success: true });
}
