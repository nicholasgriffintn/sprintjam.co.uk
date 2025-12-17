import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";

import type { Env, GithubOAuthCredentials } from "../types";
import {
  fetchGithubIssue,
  updateGithubEstimate,
} from "../services/github-service";
import { jsonError } from "../utils/http";
import { getRoomStub } from "../utils/room";

function jsonResponse(payload: unknown, status = 200): CfResponse {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  }) as unknown as CfResponse;
}

async function validateSession(
  env: Env,
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
  env: Env,
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
  url: URL,
  env: Env,
): Promise<CfResponse> {
  const issueId = url.searchParams.get("issueId");
  const roomKey = url.searchParams.get("roomKey");
  const userName = url.searchParams.get("userName");
  const sessionToken = url.searchParams.get("sessionToken");

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
  env: Env,
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
