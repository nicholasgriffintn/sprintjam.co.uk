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
import { getRoomStub } from "@sprintjam/utils";
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
  url: URL,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const issueId = url.searchParams.get("issueId");
  const roomKey = url.searchParams.get("roomKey");
  const userName = url.searchParams.get("userName");
  const sessionToken = url.searchParams.get("sessionToken");

  if (!issueId) {
    return jsonError("Issue ID is required");
  }

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const clientId = env.LINEAR_OAUTH_CLIENT_ID;
    const clientSecret = env.LINEAR_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
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
      clientId,
      clientSecret,
    );

    return jsonResponse({ ticket: issue });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Linear issue";
    const isAuth =
      message.toLowerCase().includes("session") ||
      message.toLowerCase().includes("oauth") ||
      message.toLowerCase().includes("reconnect");
    return jsonError(message, isAuth ? 401 : 500);
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
    sessionToken?: string;
    note?: string;
  }>();
  const estimate = body?.estimate;
  const roomKey = body?.roomKey;
  const userName = body?.userName;
  const sessionToken = body?.sessionToken;
  const note = typeof body?.note === "string" ? body.note.trim() : "";

  if (!issueId || estimate === undefined) {
    return jsonError("Issue ID and estimate are required");
  }

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const clientId = env.LINEAR_OAUTH_CLIENT_ID;
    const clientSecret = env.LINEAR_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
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
      clientId,
      clientSecret,
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
          clientId,
          clientSecret,
        );
      }
      return jsonResponse({ ticket: currentIssue });
    }

    const updatedIssue = await updateLinearEstimate(
      credentials,
      issueId,
      estimate,
      onTokenRefresh,
      clientId,
      clientSecret,
    );

    if (note) {
      await addLinearComment(
        credentials,
        issueId,
        `SprintJam decision note: ${note}`,
        onTokenRefresh,
        clientId,
        clientSecret,
      );
    }

    return jsonResponse({ ticket: updatedIssue });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update Linear estimate";
    const isAuth =
      message.toLowerCase().includes("session") ||
      message.toLowerCase().includes("oauth") ||
      message.toLowerCase().includes("reconnect");
    return jsonError(message, isAuth ? 401 : 500);
  }
}

export async function getLinearTeamsController(
  url: URL,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const roomKey = url.searchParams.get("roomKey");
  const userName = url.searchParams.get("userName");
  const sessionToken = url.searchParams.get("sessionToken");

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const clientId = env.LINEAR_OAUTH_CLIENT_ID;
    const clientSecret = env.LINEAR_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
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
      clientId,
      clientSecret,
    );

    return jsonResponse({ teams });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Linear teams";
    const isAuth =
      message.toLowerCase().includes("session") ||
      message.toLowerCase().includes("oauth") ||
      message.toLowerCase().includes("reconnect");
    return jsonError(message, isAuth ? 401 : 500);
  }
}

export async function getLinearCyclesController(
  url: URL,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const teamId = url.searchParams.get("teamId");
  const roomKey = url.searchParams.get("roomKey");
  const userName = url.searchParams.get("userName");
  const sessionToken = url.searchParams.get("sessionToken");

  if (!teamId) {
    return jsonError("Team ID is required");
  }

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const clientId = env.LINEAR_OAUTH_CLIENT_ID;
    const clientSecret = env.LINEAR_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
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
      clientId,
      clientSecret,
    );

    return jsonResponse({ cycles });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Linear cycles";
    const isAuth =
      message.toLowerCase().includes("session") ||
      message.toLowerCase().includes("oauth") ||
      message.toLowerCase().includes("reconnect");
    return jsonError(message, isAuth ? 401 : 500);
  }
}

export async function getLinearIssuesController(
  url: URL,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const teamId = url.searchParams.get("teamId");
  const cycleId = url.searchParams.get("cycleId");
  const search = url.searchParams.get("query");
  const roomKey = url.searchParams.get("roomKey");
  const userName = url.searchParams.get("userName");
  const sessionToken = url.searchParams.get("sessionToken");
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : null;

  if (!teamId) {
    return jsonError("Team ID is required");
  }

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  if (limitParam && Number.isNaN(limit)) {
    return jsonError("Limit must be a number");
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const clientId = env.LINEAR_OAUTH_CLIENT_ID;
    const clientSecret = env.LINEAR_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
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
      clientId,
      clientSecret,
    );

    return jsonResponse({ tickets });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Linear issues";
    const isAuth =
      message.toLowerCase().includes("session") ||
      message.toLowerCase().includes("oauth") ||
      message.toLowerCase().includes("reconnect");
    return jsonError(message, isAuth ? 401 : 500);
  }
}
