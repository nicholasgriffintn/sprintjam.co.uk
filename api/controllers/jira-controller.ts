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

function getJiraConfig(env: Env) {
  return {
    domain: env.JIRA_DOMAIN || "YOUR_DOMAIN.atlassian.net",
    email: env.JIRA_EMAIL || "YOUR_EMAIL",
    apiToken: env.JIRA_API_TOKEN || "YOUR_API_TOKEN",
    storyPointsField: env.JIRA_STORY_POINTS_FIELD || "",
  };
}

function jsonResponse(payload: unknown, status = 200): CfResponse {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  }) as unknown as CfResponse;
}

export async function getJiraTicketController(
  url: URL,
  env: Env,
): Promise<CfResponse> {
  const ticketId = url.searchParams.get("ticketId");
  const roomKey = url.searchParams.get("roomKey");
  const userName = url.searchParams.get("userName");

  if (!ticketId) {
    return jsonError("Ticket ID is required");
  }

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    const { domain, email, apiToken, storyPointsField } = getJiraConfig(env);
    const ticket = await fetchJiraTicket(
      domain,
      email,
      apiToken,
      storyPointsField,
      ticketId,
    );

    return jsonResponse({ ticket });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to fetch Jira ticket",
      500,
    );
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
  }>();
  const storyPoints = body?.storyPoints;
  const roomKey = body?.roomKey;
  const userName = body?.userName;

  if (!ticketId || storyPoints === undefined) {
    return jsonError("Ticket ID and story points are required");
  }

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    const { domain, email, apiToken, storyPointsField } = getJiraConfig(env);

    const currentTicket = await fetchJiraTicket(
      domain,
      email,
      apiToken,
      storyPointsField,
      ticketId,
    );

    if (!currentTicket) {
      return jsonError("Jira ticket not found", 404);
    }

    if (currentTicket.storyPoints === storyPoints) {
      return jsonResponse({ ticket: currentTicket });
    }

    const updatedTicket = await updateJiraStoryPoints(
      domain,
      email,
      apiToken,
      storyPointsField,
      ticketId,
      storyPoints,
      currentTicket,
    );

    return jsonResponse({ ticket: updatedTicket });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to update Jira story points",
      500,
    );
  }
}
