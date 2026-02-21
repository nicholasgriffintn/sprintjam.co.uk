import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { RoomWorkerEnv } from "@sprintjam/types";
import {
  addLinearComment,
  fetchLinearCycles,
  fetchLinearIssues,
  fetchLinearTeams,
  fetchLinearIssue,
  updateLinearEstimate,
} from "@sprintjam/services";
import { getRoomSessionToken, getRoomStub } from "@sprintjam/utils";
import { jsonError, jsonResponse } from "../../lib/response";
import {
  isAuthError,
  parseOptionalLimit,
  parseOptionalNote,
  validateSession,
} from "./shared";

const LINEAR_AUTH_ERROR_HINTS = ["session", "oauth", "reconnect"] as const;

function getLinearOAuthConfig(env: RoomWorkerEnv) {
  const clientId = env.LINEAR_OAUTH_CLIENT_ID;
  const clientSecret = env.LINEAR_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret };
}

async function getLinearCredentials(env: RoomWorkerEnv, roomKey: string) {
  const roomObject = getRoomStub(env, roomKey);
  const credentialsResponse = await roomObject.fetch(
    new Request("https://internal/linear/oauth/credentials", {
      method: "GET",
    }) as unknown as CfRequest,
  );

  if (!credentialsResponse.ok) {
    throw new Error(
      "Linear not connected. Please connect your Linear account in settings.",
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

  return { credentials, roomObject };
}

function createTokenRefreshHandler(roomObject: ReturnType<typeof getRoomStub>) {
  return async (
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
  ): Promise<void> => {
    await roomObject.fetch(
      new Request("https://internal/linear/oauth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, refreshToken, expiresAt }),
      }) as unknown as CfRequest,
    );
  };
}

export async function getLinearIssueController(
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
    return jsonError("Issue ID is required");
  }

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const oauthConfig = getLinearOAuthConfig(env);
    if (!oauthConfig) {
      return jsonError("Linear OAuth not configured", 500);
    }

    const { credentials, roomObject } = await getLinearCredentials(
      env,
      roomKey,
    );
    const onTokenRefresh = createTokenRefreshHandler(roomObject);

    const issue = await fetchLinearIssue(
      credentials,
      issueId,
      onTokenRefresh,
      oauthConfig.clientId,
      oauthConfig.clientSecret,
    );

    return jsonResponse({ ticket: issue });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Linear issue";
    return jsonError(
      message,
      isAuthError(message, LINEAR_AUTH_ERROR_HINTS) ? 401 : 500,
    );
  }
}

export async function updateLinearEstimateController(
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
    return jsonError("Issue ID and estimate are required");
  }

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const oauthConfig = getLinearOAuthConfig(env);
    if (!oauthConfig) {
      return jsonError("Linear OAuth not configured", 500);
    }

    const { credentials, roomObject } = await getLinearCredentials(
      env,
      roomKey,
    );
    const onTokenRefresh = createTokenRefreshHandler(roomObject);

    const currentIssue = await fetchLinearIssue(
      credentials,
      issueId,
      onTokenRefresh,
      oauthConfig.clientId,
      oauthConfig.clientSecret,
    );

    if (!currentIssue) {
      return jsonError("Linear issue not found", 404);
    }

    if (currentIssue.storyPoints === estimate) {
      if (note) {
        await addLinearComment(
          credentials,
          issueId,
          `SprintJam decision note: ${note}`,
          onTokenRefresh,
          oauthConfig.clientId,
          oauthConfig.clientSecret,
        );
      }
      return jsonResponse({ ticket: currentIssue });
    }

    const updatedIssue = await updateLinearEstimate(
      credentials,
      issueId,
      estimate,
      onTokenRefresh,
      oauthConfig.clientId,
      oauthConfig.clientSecret,
    );

    if (note) {
      await addLinearComment(
        credentials,
        issueId,
        `SprintJam decision note: ${note}`,
        onTokenRefresh,
        oauthConfig.clientId,
        oauthConfig.clientSecret,
      );
    }

    return jsonResponse({ ticket: updatedIssue });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update Linear estimate";
    return jsonError(
      message,
      isAuthError(message, LINEAR_AUTH_ERROR_HINTS) ? 401 : 500,
    );
  }
}

export async function getLinearTeamsController(
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

    const oauthConfig = getLinearOAuthConfig(env);
    if (!oauthConfig) {
      return jsonError("Linear OAuth not configured", 500);
    }

    const { credentials, roomObject } = await getLinearCredentials(
      env,
      roomKey,
    );
    const onTokenRefresh = createTokenRefreshHandler(roomObject);
    const teams = await fetchLinearTeams(
      credentials,
      onTokenRefresh,
      oauthConfig.clientId,
      oauthConfig.clientSecret,
    );

    return jsonResponse({ teams });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Linear teams";
    return jsonError(
      message,
      isAuthError(message, LINEAR_AUTH_ERROR_HINTS) ? 401 : 500,
    );
  }
}

export async function getLinearCyclesController(
  request: CfRequest,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<{
    teamId?: string;
    roomKey?: string;
    userName?: string;
  }>();
  const teamId = body?.teamId;
  const roomKey = body?.roomKey;
  const userName = body?.userName;

  const sessionToken = getRoomSessionToken(request);

  if (!teamId) {
    return jsonError("Team ID is required");
  }

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const oauthConfig = getLinearOAuthConfig(env);
    if (!oauthConfig) {
      return jsonError("Linear OAuth not configured", 500);
    }

    const { credentials, roomObject } = await getLinearCredentials(
      env,
      roomKey,
    );
    const onTokenRefresh = createTokenRefreshHandler(roomObject);
    const cycles = await fetchLinearCycles(
      credentials,
      teamId,
      onTokenRefresh,
      oauthConfig.clientId,
      oauthConfig.clientSecret,
    );

    return jsonResponse({ cycles });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Linear cycles";
    return jsonError(
      message,
      isAuthError(message, LINEAR_AUTH_ERROR_HINTS) ? 401 : 500,
    );
  }
}

export async function getLinearIssuesController(
  request: CfRequest,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<{
    teamId?: string;
    cycleId?: string;
    query?: string;
    roomKey?: string;
    userName?: string;
    limit?: unknown;
  }>();
  const teamId = body?.teamId;
  const cycleId = body?.cycleId ?? null;
  const search = body?.query ?? null;
  const roomKey = body?.roomKey;
  const userName = body?.userName;
  const limit = parseOptionalLimit(body?.limit);

  const sessionToken = getRoomSessionToken(request);

  if (!teamId) {
    return jsonError("Team ID is required");
  }

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const oauthConfig = getLinearOAuthConfig(env);
    if (!oauthConfig) {
      return jsonError("Linear OAuth not configured", 500);
    }

    const { credentials, roomObject } = await getLinearCredentials(
      env,
      roomKey,
    );
    const onTokenRefresh = createTokenRefreshHandler(roomObject);
    const tickets = await fetchLinearIssues(
      credentials,
      teamId,
      { cycleId, limit, search },
      onTokenRefresh,
      oauthConfig.clientId,
      oauthConfig.clientSecret,
    );

    return jsonResponse({ tickets });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Linear issues";
    return jsonError(
      message,
      isAuthError(message, LINEAR_AUTH_ERROR_HINTS) ? 401 : 500,
    );
  }
}
