import type {
  JiraBoard,
  JiraFieldOption,
  JiraOAuthStatus,
  JiraSprint,
} from "@sprintjam/types";

import type { TicketMetadata } from "@/types";
import { providerRequestJson, providerRequestVoid } from "@/lib/provider-api";

export async function fetchJiraTicket(
  ticketId: string,
  options?: { roomKey?: string; userName?: string },
): Promise<TicketMetadata> {
  const data = await providerRequestJson<{ ticket?: TicketMetadata }>(
    "/jira/ticket",
    {
      method: "POST",
      body: {
        ticketId,
        roomKey: options?.roomKey,
        userName: options?.userName,
      },
      fallbackError: "Failed to fetch Jira ticket",
      includeStatusInFallback: true,
    },
  );

  if (!data.ticket) {
    throw new Error("Invalid response format from Jira API");
  }

  return data.ticket;
}

export async function updateJiraStoryPoints(
  ticketId: string,
  storyPoints: number,
  options: {
    roomKey: string;
    userName: string;
    note?: string;
  },
): Promise<TicketMetadata> {
  const data = await providerRequestJson<{ ticket: TicketMetadata }>(
    `/jira/ticket/${encodeURIComponent(ticketId)}/storyPoints`,
    {
      method: "PUT",
      body: {
        storyPoints,
        roomKey: options.roomKey,
        userName: options.userName,
        note: options.note,
      },
      fallbackError: "Failed to update Jira story points",
      includeStatusInFallback: true,
    },
  );

  return data.ticket;
}

export async function fetchJiraBoards(
  roomKey: string,
  userName: string,
): Promise<JiraBoard[]> {
  const data = await providerRequestJson<{ boards?: JiraBoard[] }>(
    "/jira/boards",
    {
      method: "POST",
      body: { roomKey, userName },
      fallbackError: "Failed to fetch Jira boards",
    },
  );

  return data.boards ?? [];
}

export async function fetchJiraSprints(
  boardId: string,
  roomKey: string,
  userName: string,
): Promise<JiraSprint[]> {
  const data = await providerRequestJson<{ sprints?: JiraSprint[] }>(
    "/jira/sprints",
    {
      method: "POST",
      body: { boardId, roomKey, userName },
      fallbackError: "Failed to fetch Jira sprints",
    },
  );

  return data.sprints ?? [];
}

export async function fetchJiraBoardIssues(
  boardId: string,
  options: {
    sprintId?: string | null;
    limit?: number | null;
    search?: string | null;
  },
  roomKey: string,
  userName: string,
): Promise<TicketMetadata[]> {
  const data = await providerRequestJson<{ tickets?: TicketMetadata[] }>(
    "/jira/issues",
    {
      method: "POST",
      body: {
        boardId,
        roomKey,
        userName,
        sprintId: options.sprintId,
        query: options.search,
        limit: options.limit,
      },
      fallbackError: "Failed to fetch Jira issues",
    },
  );

  return data.tickets ?? [];
}

export async function getJiraOAuthStatus(
  roomKey: string,
  userName: string,
): Promise<JiraOAuthStatus> {
  return providerRequestJson<JiraOAuthStatus>("/jira/oauth/status", {
    method: "POST",
    body: { roomKey, userName },
    fallbackError: "Failed to fetch OAuth status",
  });
}

export async function getJiraFields(
  roomKey: string,
  userName: string,
): Promise<{
  fields: JiraFieldOption[];
  storyPointsField?: string | null;
  sprintField?: string | null;
}> {
  return providerRequestJson<{
    fields: JiraFieldOption[];
    storyPointsField?: string | null;
    sprintField?: string | null;
  }>("/jira/oauth/fields", {
    method: "POST",
    body: { roomKey, userName },
    fallbackError: "Failed to fetch Jira fields",
  });
}

export async function authorizeJiraOAuth(
  roomKey: string,
  userName: string,
): Promise<{ authorizationUrl: string }> {
  return providerRequestJson<{ authorizationUrl: string }>(
    "/jira/oauth/authorize",
    {
      method: "POST",
      body: { roomKey, userName },
      fallbackError: "Failed to initiate OAuth",
    },
  );
}

export async function revokeJiraOAuth(
  roomKey: string,
  userName: string,
): Promise<void> {
  return providerRequestVoid("/jira/oauth/revoke", {
    method: "DELETE",
    body: { roomKey, userName },
    fallbackError: "Failed to disconnect Jira",
  });
}

export async function saveJiraFieldConfiguration(
  roomKey: string,
  userName: string,
  options: { storyPointsField?: string | null; sprintField?: string | null },
): Promise<void> {
  return providerRequestVoid("/jira/oauth/fields", {
    method: "PUT",
    body: {
      roomKey,
      userName,
      storyPointsField: options.storyPointsField,
      sprintField: options.sprintField,
    },
    fallbackError: "Failed to save Jira field settings",
  });
}
