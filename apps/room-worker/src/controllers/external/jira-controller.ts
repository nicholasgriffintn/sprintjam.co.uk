import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { RoomWorkerEnv } from "@sprintjam/types";
import {
  addJiraComment,
  fetchJiraBoardIssues,
  fetchJiraBoards,
  fetchJiraSprints,
  fetchJiraTicket,
  updateJiraStoryPoints,
} from "@sprintjam/services";
import { getRoomSessionToken, getRoomStub } from "@sprintjam/utils";

import { jsonError, jsonResponse } from "../../lib/response";
import { isAuthError, parseOptionalNote, validateSession } from "./shared";

const JIRA_AUTH_ERROR_HINTS = ["session", "oauth", "reconnect"] as const;

function getJiraOAuthConfig(env: RoomWorkerEnv) {
  const clientId = env.JIRA_OAUTH_CLIENT_ID;
  const clientSecret = env.JIRA_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret };
}

async function getJiraCredentials(env: RoomWorkerEnv, roomKey: string) {
  const roomObject = getRoomStub(env, roomKey);
  const credentialsResponse = await roomObject.fetch(
    new Request("https://internal/jira/oauth/credentials", {
      method: "GET",
    }) as unknown as CfRequest,
  );

  if (!credentialsResponse.ok) {
    throw new Error(
      "Jira not connected. Please connect your Jira account in settings.",
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

  return { credentials, roomObject };
}

function createTokenRefreshHandler(roomObject: ReturnType<typeof getRoomStub>) {
  return async (
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
  ) => {
    const response = await roomObject.fetch(
      new Request("https://internal/jira/oauth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, refreshToken, expiresAt }),
      }) as unknown as CfRequest,
    );

    if (!response.ok) {
      throw new Error("Failed to persist Jira token refresh.");
    }
  };
}

export async function getJiraTicketController(
  request: CfRequest,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<{
    ticketId?: string;
    roomKey?: string;
    userName?: string;
  }>();
  const ticketId = body?.ticketId;
  const roomKey = body?.roomKey;
  const userName = body?.userName;

  const sessionToken = getRoomSessionToken(request);

  if (!ticketId) {
    return jsonError("Ticket ID is required");
  }

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const oauthConfig = getJiraOAuthConfig(env);
    if (!oauthConfig) {
      return jsonError("Jira OAuth not configured", 500);
    }

    const { credentials, roomObject } = await getJiraCredentials(env, roomKey);
    const onTokenRefresh = createTokenRefreshHandler(roomObject);

    const ticket = await fetchJiraTicket(
      credentials,
      ticketId,
      onTokenRefresh,
      oauthConfig.clientId,
      oauthConfig.clientSecret,
    );

    return jsonResponse({ ticket });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Jira ticket";
    return jsonError(
      message,
      isAuthError(message, JIRA_AUTH_ERROR_HINTS) ? 401 : 500,
    );
  }
}

export async function updateJiraStoryPointsController(
  ticketId: string,
  request: CfRequest,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<{
    storyPoints?: number;
    roomKey?: string;
    userName?: string;
    note?: string;
  }>();
  const storyPoints = body?.storyPoints;
  const roomKey = body?.roomKey;
  const userName = body?.userName;
  const note = parseOptionalNote(body?.note);

  const sessionToken = getRoomSessionToken(request);

  if (!ticketId || storyPoints === undefined) {
    return jsonError("Ticket ID and story points are required");
  }

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const oauthConfig = getJiraOAuthConfig(env);
    if (!oauthConfig) {
      return jsonError("Jira OAuth not configured", 500);
    }

    const { credentials, roomObject } = await getJiraCredentials(env, roomKey);
    const onTokenRefresh = createTokenRefreshHandler(roomObject);

    const currentTicket = await fetchJiraTicket(
      credentials,
      ticketId,
      onTokenRefresh,
      oauthConfig.clientId,
      oauthConfig.clientSecret,
    );

    if (!currentTicket) {
      return jsonError("Jira ticket not found", 404);
    }

    if (currentTicket.storyPoints === storyPoints) {
      if (note) {
        await addJiraComment(
          credentials,
          ticketId,
          `SprintJam decision note: ${note}`,
          onTokenRefresh,
          oauthConfig.clientId,
          oauthConfig.clientSecret,
        );
      }
      return jsonResponse({ ticket: currentTicket });
    }

    const updatedTicket = await updateJiraStoryPoints(
      credentials,
      ticketId,
      storyPoints,
      currentTicket,
      onTokenRefresh,
      oauthConfig.clientId,
      oauthConfig.clientSecret,
    );

    if (note) {
      await addJiraComment(
        credentials,
        ticketId,
        `SprintJam decision note: ${note}`,
        onTokenRefresh,
        oauthConfig.clientId,
        oauthConfig.clientSecret,
      );
    }

    return jsonResponse({ ticket: updatedTicket });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update Jira story points";
    return jsonError(
      message,
      isAuthError(message, JIRA_AUTH_ERROR_HINTS) ? 401 : 500,
    );
  }
}

export async function getJiraBoardsController(
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

    const oauthConfig = getJiraOAuthConfig(env);
    if (!oauthConfig) {
      return jsonError("Jira OAuth not configured", 500);
    }

    const { credentials, roomObject } = await getJiraCredentials(env, roomKey);
    const onTokenRefresh = createTokenRefreshHandler(roomObject);
    const boards = await fetchJiraBoards(
      credentials,
      onTokenRefresh,
      oauthConfig.clientId,
      oauthConfig.clientSecret,
    );

    return jsonResponse({ boards });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Jira boards";
    return jsonError(
      message,
      isAuthError(message, JIRA_AUTH_ERROR_HINTS) ? 401 : 500,
    );
  }
}

export async function getJiraSprintsController(
  request: CfRequest,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<{
    boardId?: string;
    roomKey?: string;
    userName?: string;
  }>();
  const boardId = body?.boardId;
  const roomKey = body?.roomKey;
  const userName = body?.userName;

  const sessionToken = getRoomSessionToken(request);

  if (!boardId) {
    return jsonError("Board ID is required");
  }

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const oauthConfig = getJiraOAuthConfig(env);
    if (!oauthConfig) {
      return jsonError("Jira OAuth not configured", 500);
    }

    const { credentials, roomObject } = await getJiraCredentials(env, roomKey);
    const onTokenRefresh = createTokenRefreshHandler(roomObject);
    const sprints = await fetchJiraSprints(
      credentials,
      boardId,
      onTokenRefresh,
      oauthConfig.clientId,
      oauthConfig.clientSecret,
    );

    return jsonResponse({ sprints });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Jira sprints";
    return jsonError(
      message,
      isAuthError(message, JIRA_AUTH_ERROR_HINTS) ? 401 : 500,
    );
  }
}

export async function getJiraIssuesController(
  request: CfRequest,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<{
    boardId?: string;
    sprintId?: string;
    query?: string;
    roomKey?: string;
    userName?: string;
    limit?: number;
  }>();
  const boardId = body?.boardId;
  const sprintId = body?.sprintId ?? null;
  const search = body?.query ?? null;
  const roomKey = body?.roomKey;
  const userName = body?.userName;
  const limit = body?.limit ?? null;

  const sessionToken = getRoomSessionToken(request);

  if (!boardId) {
    return jsonError("Board ID is required");
  }

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const oauthConfig = getJiraOAuthConfig(env);
    if (!oauthConfig) {
      return jsonError("Jira OAuth not configured", 500);
    }

    const { credentials, roomObject } = await getJiraCredentials(env, roomKey);
    const onTokenRefresh = createTokenRefreshHandler(roomObject);
    const tickets = await fetchJiraBoardIssues(
      credentials,
      boardId,
      { sprintId, limit, search },
      onTokenRefresh,
      oauthConfig.clientId,
      oauthConfig.clientSecret,
    );

    return jsonResponse({ tickets });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Jira issues";
    return jsonError(
      message,
      isAuthError(message, JIRA_AUTH_ERROR_HINTS) ? 401 : 500,
    );
  }
}
