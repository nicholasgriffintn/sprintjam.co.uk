import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";

import type { Env } from "../types";
import {
  fetchJiraTicket,
  updateJiraStoryPoints,
} from "../services/jira-service";
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

export async function getJiraTicketController(
  url: URL,
  env: Env,
): Promise<CfResponse> {
  const ticketId = url.searchParams.get("ticketId");
  const roomKey = url.searchParams.get("roomKey");
  const userName = url.searchParams.get("userName");
  const sessionToken = url.searchParams.get("sessionToken");

  if (!ticketId) {
    return jsonError("Ticket ID is required");
  }

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const clientId = env.JIRA_OAUTH_CLIENT_ID;
    const clientSecret = env.JIRA_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return jsonError("Jira OAuth not configured", 500);
    }

    const roomObject = getRoomStub(env, roomKey);
    const credentialsResponse = await roomObject.fetch(
      new Request("https://internal/jira/oauth/credentials", {
        method: "GET",
      }) as unknown as CfRequest,
    );

    if (!credentialsResponse.ok) {
      return jsonError(
        "Jira not connected. Please connect your Jira account in settings.",
        401,
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
      expiresAt: number,
    ) => {
      await roomObject.fetch(
        new Request("https://internal/jira/oauth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken, refreshToken, expiresAt }),
        }) as unknown as CfRequest,
      );
    };

    const ticket = await fetchJiraTicket(
      credentials,
      ticketId,
      onTokenRefresh,
      clientId,
      clientSecret,
    );

    return jsonResponse({ ticket });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Jira ticket";
    const isAuth =
      message.toLowerCase().includes("session") ||
      message.toLowerCase().includes("oauth") ||
      message.toLowerCase().includes("reconnect");
    return jsonError(message, isAuth ? 401 : 500);
  }
}

export async function updateJiraStoryPointsController(
  ticketId: string,
  request: CfRequest,
  env: Env,
): Promise<CfResponse> {
  const body = await request.json<{
    storyPoints?: number;
    roomKey?: string;
    userName?: string;
    sessionToken?: string;
  }>();
  const storyPoints = body?.storyPoints;
  const roomKey = body?.roomKey;
  const userName = body?.userName;
  const sessionToken = body?.sessionToken;

  if (!ticketId || storyPoints === undefined) {
    return jsonError("Ticket ID and story points are required");
  }

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const clientId = env.JIRA_OAUTH_CLIENT_ID;
    const clientSecret = env.JIRA_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return jsonError("Jira OAuth not configured", 500);
    }

    const roomObject = getRoomStub(env, roomKey);
    const credentialsResponse = await roomObject.fetch(
      new Request("https://internal/jira/oauth/credentials", {
        method: "GET",
      }) as unknown as CfRequest,
    );

    if (!credentialsResponse.ok) {
      return jsonError(
        "Jira not connected. Please connect your Jira account in settings.",
        401,
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
      expiresAt: number,
    ) => {
      await roomObject.fetch(
        new Request("https://internal/jira/oauth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken, refreshToken, expiresAt }),
        }) as unknown as CfRequest,
      );
    };

    const currentTicket = await fetchJiraTicket(
      credentials,
      ticketId,
      onTokenRefresh,
      clientId,
      clientSecret,
    );

    if (!currentTicket) {
      return jsonError("Jira ticket not found", 404);
    }

    if (currentTicket.storyPoints === storyPoints) {
      return jsonResponse({ ticket: currentTicket });
    }

    const updatedTicket = await updateJiraStoryPoints(
      credentials,
      ticketId,
      storyPoints,
      currentTicket,
      onTokenRefresh,
      clientId,
      clientSecret,
    );

    return jsonResponse({ ticket: updatedTicket });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update Jira story points";
    const isAuth =
      message.toLowerCase().includes("session") ||
      message.toLowerCase().includes("oauth") ||
      message.toLowerCase().includes("reconnect");
    return jsonError(message, isAuth ? 401 : 500);
  }
}
