import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { RoomWorkerEnv, GithubOAuthCredentials } from "@sprintjam/types";
import {
  addGithubComment,
  fetchGithubMilestones,
  fetchGithubIssue,
  fetchGithubRepoIssues,
  fetchGithubRepos,
  updateGithubEstimate,
} from "@sprintjam/services";
import { getRoomStub, getRoomSessionToken } from "@sprintjam/utils";
import { jsonError, jsonResponse } from "../../lib/response";
import {
  isAuthError,
  parseOptionalLimit,
  parseOptionalNote,
  validateSession,
} from "./shared";

const GITHUB_AUTH_ERROR_HINTS = ["session", "connect"] as const;

function getGithubOAuthConfig(env: RoomWorkerEnv) {
  const clientId = env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = env.GITHUB_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret };
}

async function getGithubCredentials(
  env: RoomWorkerEnv,
  roomKey: string,
): Promise<GithubOAuthCredentials> {
  const roomObject = getRoomStub(env, roomKey);
  const credentialsResponse = await roomObject.fetch(
    new Request("https://internal/github/oauth/credentials", {
      method: "GET",
    }) as unknown as CfRequest,
  );

  if (!credentialsResponse.ok) {
    throw new Error(
      "GitHub not connected. Please connect your GitHub account in settings.",
    );
  }

  const { credentials } = await credentialsResponse.json<{
    credentials: GithubOAuthCredentials;
  }>();

  return credentials;
}

export async function getGithubIssueController(
  request: CfRequest,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<{
    issueId?: string;
    roomKey?: string;
    userName?: string;
  }>();
  const issueId = body?.issueId;
  const roomKey = body?.roomKey;
  const userName = body?.userName;

  const sessionToken = getRoomSessionToken(request);

  if (!issueId) {
    return jsonError("Issue identifier is required");
  }

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    if (!getGithubOAuthConfig(env)) {
      return jsonError("GitHub OAuth not configured", 500);
    }

    const credentials = await getGithubCredentials(env, roomKey);
    const ticket = await fetchGithubIssue(credentials, issueId);

    return jsonResponse({ ticket });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch GitHub issue";
    return jsonError(
      message,
      isAuthError(message, GITHUB_AUTH_ERROR_HINTS) ? 401 : 500,
    );
  }
}

export async function updateGithubEstimateController(
  issueId: string,
  request: CfRequest,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<{
    estimate?: number;
    roomKey?: string;
    userName?: string;
    note?: string;
  }>();
  const estimate = body?.estimate;
  const roomKey = body?.roomKey;
  const userName = body?.userName;
  const note = parseOptionalNote(body?.note);

  const sessionToken = getRoomSessionToken(request);

  if (!issueId || estimate === undefined) {
    return jsonError("Issue identifier and estimate are required");
  }

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    if (!getGithubOAuthConfig(env)) {
      return jsonError("GitHub OAuth not configured", 500);
    }

    const credentials = await getGithubCredentials(env, roomKey);
    const ticket = await updateGithubEstimate(credentials, issueId, estimate);

    if (note) {
      await addGithubComment(
        credentials,
        issueId,
        `SprintJam decision note: ${note}`,
      );
    }

    return jsonResponse({ ticket });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to sync estimate to GitHub";
    return jsonError(
      message,
      isAuthError(message, GITHUB_AUTH_ERROR_HINTS) ? 401 : 500,
    );
  }
}

export async function getGithubReposController(
  request: CfRequest,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<{
    roomKey?: string;
    userName?: string;
  }>();
  const roomKey = body?.roomKey;
  const userName = body?.userName;

  const sessionToken = getRoomSessionToken(request);

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    if (!getGithubOAuthConfig(env)) {
      return jsonError("GitHub OAuth not configured", 500);
    }

    const credentials = await getGithubCredentials(env, roomKey);
    const repos = await fetchGithubRepos(credentials);

    return jsonResponse({ repos });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch GitHub repos";
    return jsonError(
      message,
      isAuthError(message, GITHUB_AUTH_ERROR_HINTS) ? 401 : 500,
    );
  }
}

export async function getGithubMilestonesController(
  request: CfRequest,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<{
    repo?: string;
    roomKey?: string;
    userName?: string;
  }>();
  const repository = body?.repo;
  const roomKey = body?.roomKey;
  const userName = body?.userName;

  const sessionToken = getRoomSessionToken(request);

  if (!repository) {
    return jsonError("Repository is required");
  }

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    if (!getGithubOAuthConfig(env)) {
      return jsonError("GitHub OAuth not configured", 500);
    }

    const credentials = await getGithubCredentials(env, roomKey);
    const milestones = await fetchGithubMilestones(credentials, repository);

    return jsonResponse({ milestones });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch GitHub milestones";
    return jsonError(
      message,
      isAuthError(message, GITHUB_AUTH_ERROR_HINTS) ? 401 : 500,
    );
  }
}

export async function getGithubIssuesController(
  request: CfRequest,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<{
    repo?: string;
    milestoneNumber?: number;
    milestoneTitle?: string;
    query?: string;
    roomKey?: string;
    userName?: string;
    limit?: unknown;
  }>();
  const repository = body?.repo;
  const milestoneNumber = body?.milestoneNumber ?? null;
  const milestoneTitle = body?.milestoneTitle ?? null;
  const search = body?.query ?? null;
  const roomKey = body?.roomKey;
  const userName = body?.userName;
  const limit = parseOptionalLimit(body?.limit);

  const sessionToken = getRoomSessionToken(request);

  if (!repository) {
    return jsonError("Repository is required");
  }

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    if (!getGithubOAuthConfig(env)) {
      return jsonError("GitHub OAuth not configured", 500);
    }

    const credentials = await getGithubCredentials(env, roomKey);
    const tickets = await fetchGithubRepoIssues(credentials, repository, {
      milestoneNumber,
      milestoneTitle: milestoneTitle ?? null,
      limit,
      search,
    });

    return jsonResponse({ tickets });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch GitHub issues";
    return jsonError(
      message,
      isAuthError(message, GITHUB_AUTH_ERROR_HINTS) ? 401 : 500,
    );
  }
}
