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
import { getRoomStub, getRoomSessionToken } from '@sprintjam/utils';
import { jsonError, jsonResponse } from "../../lib/response";

async function validateSession(
  env: RoomWorkerEnv,
  roomKey: string,
  userName: string,
  sessionToken?: string | null,
) {
  if (!sessionToken) {
    throw new Error("Missing session token");
  }

  const roomObject = getRoomStub(env, roomKey);
  const response = await roomObject.fetch(
    new Request("https://internal/session/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: userName, sessionToken }),
    }) as unknown as CfRequest,
  );

  if (!response.ok) {
    const error = await response.json<{
      error?: string;
    }>();
    throw new Error(error.error || "Invalid session");
  }
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

    const clientId = env.GITHUB_OAUTH_CLIENT_ID;
    const clientSecret = env.GITHUB_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return jsonError("GitHub OAuth not configured", 500);
    }

    const credentials = await getGithubCredentials(env, roomKey);
    const ticket = await fetchGithubIssue(credentials, issueId);

    return jsonResponse({ ticket });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch GitHub issue";
    const isAuth =
      message.toLowerCase().includes("session") ||
      message.toLowerCase().includes("connect");
    return jsonError(message, isAuth ? 401 : 500);
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
  const note = typeof body?.note === "string" ? body.note.trim() : "";

  const sessionToken = getRoomSessionToken(request);

  if (!issueId || estimate === undefined) {
    return jsonError("Issue identifier and estimate are required");
  }

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const clientId = env.GITHUB_OAUTH_CLIENT_ID;
    const clientSecret = env.GITHUB_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
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
    const isAuth =
      message.toLowerCase().includes("session") ||
      message.toLowerCase().includes("connect");
    return jsonError(message, isAuth ? 401 : 500);
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

    const clientId = env.GITHUB_OAUTH_CLIENT_ID;
    const clientSecret = env.GITHUB_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return jsonError("GitHub OAuth not configured", 500);
    }

    const credentials = await getGithubCredentials(env, roomKey);
    const repos = await fetchGithubRepos(credentials);

    return jsonResponse({ repos });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch GitHub repos";
    const isAuth =
      message.toLowerCase().includes("session") ||
      message.toLowerCase().includes("connect");
    return jsonError(message, isAuth ? 401 : 500);
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

    const clientId = env.GITHUB_OAUTH_CLIENT_ID;
    const clientSecret = env.GITHUB_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
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
    const isAuth =
      message.toLowerCase().includes("session") ||
      message.toLowerCase().includes("connect");
    return jsonError(message, isAuth ? 401 : 500);
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
  const limit =
    body?.limit === undefined || body?.limit === null
      ? null
      : typeof body.limit === "number"
        ? body.limit
        : typeof body.limit === "string" && !Number.isNaN(Number(body.limit))
          ? Number(body.limit)
          : null;

  const sessionToken = getRoomSessionToken(request);

  if (!repository) {
    return jsonError("Repository is required");
  }

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const clientId = env.GITHUB_OAUTH_CLIENT_ID;
    const clientSecret = env.GITHUB_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
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
    const isAuth =
      message.toLowerCase().includes("session") ||
      message.toLowerCase().includes("connect");
    return jsonError(message, isAuth ? 401 : 500);
  }
}
