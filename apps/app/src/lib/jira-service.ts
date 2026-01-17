import type { VoteValue, TicketMetadata } from "@/types";
import { API_BASE_URL } from "@/constants";
import { safeLocalStorage } from "@/utils/storage";
import { AUTH_TOKEN_STORAGE_KEY } from "@/constants";

function resolveSessionToken(provided?: string | null): string {
  if (provided) return provided;
  const stored = safeLocalStorage.get(AUTH_TOKEN_STORAGE_KEY);
  if (!stored) {
    throw new Error("Missing session token. Please rejoin the room.");
  }
  return stored;
}

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
  options?: { roomKey?: string; userName?: string; sessionToken?: string },
): Promise<TicketMetadata> {
  try {
    const sessionToken = resolveSessionToken(options?.sessionToken);
    let url = `${API_BASE_URL}/jira/ticket?ticketId=${encodeURIComponent(
      ticketId,
    )}`;

    if (options?.roomKey && options?.userName) {
      url += `&roomKey=${encodeURIComponent(
        options.roomKey,
      )}&userName=${encodeURIComponent(options.userName)}`;
      url += `&sessionToken=${encodeURIComponent(sessionToken)}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
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
    sessionToken?: string;
    note?: string;
  },
): Promise<TicketMetadata> {
  try {
    const sessionToken = resolveSessionToken(options.sessionToken);
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
          sessionToken,
          note: options.note,
        }),
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
  sessionToken?: string | null,
): Promise<JiraBoard[]> {
  const token = resolveSessionToken(sessionToken);
  const response = await fetch(
    `${API_BASE_URL}/jira/boards?roomKey=${encodeURIComponent(
      roomKey,
    )}&userName=${encodeURIComponent(userName)}&sessionToken=${encodeURIComponent(
      token,
    )}`,
  );

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
  sessionToken?: string | null,
): Promise<JiraSprint[]> {
  const token = resolveSessionToken(sessionToken);
  const response = await fetch(
    `${API_BASE_URL}/jira/sprints?boardId=${encodeURIComponent(
      boardId,
    )}&roomKey=${encodeURIComponent(roomKey)}&userName=${encodeURIComponent(
      userName,
    )}&sessionToken=${encodeURIComponent(token)}`,
  );

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
  options: { sprintId?: string | null; limit?: number | null; search?: string | null },
  roomKey: string,
  userName: string,
  sessionToken?: string | null,
): Promise<TicketMetadata[]> {
  const token = resolveSessionToken(sessionToken);
  const params = new URLSearchParams();
  params.set("boardId", boardId);
  params.set("roomKey", roomKey);
  params.set("userName", userName);
  params.set("sessionToken", token);
  if (options.sprintId) {
    params.set("sprintId", options.sprintId);
  }
  if (options.search) {
    params.set("query", options.search);
  }
  if (options.limit) {
    params.set("limit", String(options.limit));
  }

  const response = await fetch(
    `${API_BASE_URL}/jira/issues?${params.toString()}`,
  );

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
  sessionToken?: string | null,
): Promise<JiraOAuthStatus> {
  const token = resolveSessionToken(sessionToken);
  const response = await fetch(
    `${API_BASE_URL}/jira/oauth/status?roomKey=${encodeURIComponent(
      roomKey,
    )}&userName=${encodeURIComponent(userName)}&sessionToken=${encodeURIComponent(
      token,
    )}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch OAuth status");
  }

  return (await response.json()) as JiraOAuthStatus;
}

export async function getJiraFields(
  roomKey: string,
  userName: string,
  sessionToken?: string | null,
): Promise<{
  fields: JiraFieldOption[];
  storyPointsField?: string | null;
  sprintField?: string | null;
}> {
  const token = resolveSessionToken(sessionToken);
  const response = await fetch(
    `${API_BASE_URL}/jira/oauth/fields?roomKey=${encodeURIComponent(
      roomKey,
    )}&userName=${encodeURIComponent(userName)}&sessionToken=${encodeURIComponent(
      token,
    )}`,
  );

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
  sessionToken?: string | null
): Promise<{ authorizationUrl: string }> {
  const token = resolveSessionToken(sessionToken);
  const response = await fetch(`${API_BASE_URL}/jira/oauth/authorize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      roomKey,
      userName,
      sessionToken: token,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to initiate OAuth');
  }

  return (await response.json()) as { authorizationUrl: string };
}

export async function revokeJiraOAuth(
  roomKey: string,
  userName: string,
  sessionToken?: string | null,
): Promise<void> {
  const token = resolveSessionToken(sessionToken);
  const response = await fetch(`${API_BASE_URL}/jira/oauth/revoke`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      roomKey,
      userName,
      sessionToken: token,
    }),
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
  sessionToken?: string | null,
): Promise<void> {
  const token = resolveSessionToken(sessionToken);
  const response = await fetch(`${API_BASE_URL}/jira/oauth/fields`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      roomKey,
      userName,
      sessionToken: token,
      storyPointsField: options.storyPointsField,
      sprintField: options.sprintField,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to save Jira field settings");
  }
}
