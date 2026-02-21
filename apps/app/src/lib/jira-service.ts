import type { VoteValue, TicketMetadata } from "@/types";
import { API_BASE_URL } from "@/constants";
export interface JiraOAuthStatus {
  connected: boolean;
  jiraDomain?: string;
  jiraUserEmail?: string;
  expiresAt?: number;
  storyPointsField?: string | null;
  sprintField?: string | null;
}

export interface JiraFieldOption {
  id: string;
  name: string;
  type?: string | null;
  custom?: boolean;
}

export interface JiraBoard {
  id: string;
  name: string;
  type?: string;
}

export interface JiraSprint {
  id: string;
  name: string;
  state?: string;
  startDate?: string | null;
  endDate?: string | null;
}

export async function fetchJiraTicket(
  ticketId: string,
  options?: { roomKey?: string; userName?: string },
): Promise<TicketMetadata> {
  try {
    const response = await fetch(`${API_BASE_URL}/jira/ticket`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId,
        roomKey: options?.roomKey,
        userName: options?.userName,
      }),
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Failed to fetch Jira ticket: ${response.status}`,
      );
    }

    const data = await response.json();

    const ticket: TicketMetadata | undefined = data.ticket;

    if (ticket) {
      return ticket;
    }
    throw new Error("Invalid response format from Jira API");
  } catch (error) {
    console.error("Error fetching Jira ticket:", error);
    throw error;
  }
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
  try {
    const response = await fetch(
      `${API_BASE_URL}/jira/ticket/${encodeURIComponent(ticketId)}/storyPoints`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storyPoints,
          roomKey: options.roomKey,
          userName: options.userName,
          note: options.note,
        }),
        credentials: "include",
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error ||
          `Failed to update Jira story points: ${response.status}`,
      );
    }

    const data = await response.json();
    const ticket = data.ticket as TicketMetadata;

    return ticket;
  } catch (error) {
    console.error("Error updating Jira story points:", error);
    throw error;
  }
}

export async function fetchJiraBoards(
  roomKey: string,
  userName: string,
): Promise<JiraBoard[]> {
  const response = await fetch(`${API_BASE_URL}/jira/boards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomKey, userName }),
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error || "Failed to fetch Jira boards",
    );
  }

  const data = (await response.json()) as { boards?: JiraBoard[] };
  return data.boards ?? [];
}

export async function fetchJiraSprints(
  boardId: string,
  roomKey: string,
  userName: string,
): Promise<JiraSprint[]> {
  const response = await fetch(`${API_BASE_URL}/jira/sprints`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ boardId, roomKey, userName }),
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error || "Failed to fetch Jira sprints",
    );
  }

  const data = (await response.json()) as { sprints?: JiraSprint[] };
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
  const response = await fetch(`${API_BASE_URL}/jira/issues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      boardId,
      roomKey,
      userName,
      sprintId: options.sprintId,
      query: options.search,
      limit: options.limit,
    }),
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error || "Failed to fetch Jira issues",
    );
  }

  const data = (await response.json()) as { tickets?: TicketMetadata[] };
  return data.tickets ?? [];
}

export function convertVoteValueToStoryPoints(
  voteValue: VoteValue | null,
): number | null {
  const ignoredValues = new Set(["?", "❓", "coffee", "☕", "♾️"]);
  if (voteValue === null || ignoredValues.has(String(voteValue))) {
    return null;
  }

  const numericValue =
    typeof voteValue === "number" ? voteValue : Number(voteValue);

  if (Number.isNaN(numericValue)) {
    return null;
  }

  return numericValue;
}

export async function getJiraOAuthStatus(
  roomKey: string,
  userName: string,
): Promise<JiraOAuthStatus> {
  const response = await fetch(`${API_BASE_URL}/jira/oauth/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomKey, userName }),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch OAuth status");
  }

  return (await response.json()) as JiraOAuthStatus;
}

export async function getJiraFields(
  roomKey: string,
  userName: string,
): Promise<{
  fields: JiraFieldOption[];
  storyPointsField?: string | null;
  sprintField?: string | null;
}> {
  const response = await fetch(`${API_BASE_URL}/jira/oauth/fields`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomKey, userName }),
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch Jira fields");
  }

  return (await response.json()) as {
    fields: JiraFieldOption[];
    storyPointsField?: string | null;
    sprintField?: string | null;
  };
}

export async function authorizeJiraOAuth(
  roomKey: string,
  userName: string,
): Promise<{ authorizationUrl: string }> {
  const response = await fetch(`${API_BASE_URL}/jira/oauth/authorize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      roomKey,
      userName,
    }),
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to initiate OAuth");
  }

  return (await response.json()) as { authorizationUrl: string };
}

export async function revokeJiraOAuth(
  roomKey: string,
  userName: string,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/jira/oauth/revoke`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      roomKey,
      userName,
    }),
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to disconnect Jira");
  }
}

export async function saveJiraFieldConfiguration(
  roomKey: string,
  userName: string,
  options: { storyPointsField?: string | null; sprintField?: string | null },
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/jira/oauth/fields`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      roomKey,
      userName,
      storyPointsField: options.storyPointsField,
      sprintField: options.sprintField,
    }),
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to save Jira field settings");
  }
}
