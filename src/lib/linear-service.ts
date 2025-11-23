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

export interface LinearOAuthStatus {
  connected: boolean;
  linearOrganizationId?: string;
  linearUserEmail?: string;
  expiresAt?: number;
  estimateField?: string | null;
}

export async function fetchLinearIssue(
  issueId: string,
  options?: { roomKey?: string; userName?: string; sessionToken?: string }
): Promise<TicketMetadata> {
  try {
    const sessionToken = resolveSessionToken(options?.sessionToken);
    let url = `${API_BASE_URL}/linear/issue?issueId=${encodeURIComponent(
      issueId
    )}`;

    if (options?.roomKey && options?.userName) {
      url += `&roomKey=${encodeURIComponent(
        options.roomKey
      )}&userName=${encodeURIComponent(options.userName)}`;
      url += `&sessionToken=${encodeURIComponent(sessionToken)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Failed to fetch Linear issue: ${response.status}`
      );
    }

    const data = await response.json();

    const ticket: TicketMetadata | undefined = data.ticket;

    if (ticket) {
      return ticket;
    }
    throw new Error('Invalid response format from Linear API');
  } catch (error) {
    console.error('Error fetching Linear issue:', error);
    throw error;
  }
}

export async function updateLinearEstimate(
  issueId: string,
  estimate: number,
  options: { roomKey: string; userName: string; sessionToken?: string },
): Promise<TicketMetadata> {
  try {
    const sessionToken = resolveSessionToken(options.sessionToken);
    const response = await fetch(
      `${API_BASE_URL}/linear/issue/${encodeURIComponent(issueId)}/estimate`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          estimate,
          roomKey: options.roomKey,
          userName: options.userName,
          sessionToken,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error ||
        `Failed to update Linear estimate: ${response.status}`,
      );
    }

    const data = await response.json();
    const ticket = data.ticket as TicketMetadata;

    return ticket;
  } catch (error) {
    console.error("Error updating Linear estimate:", error);
    throw error;
  }
}

export function convertVoteValueToEstimate(
  voteValue: VoteValue,
): number | null {
  if (voteValue === null || voteValue === "?" || voteValue === "coffee") {
    return null;
  }

  const numericValue =
    typeof voteValue === "number" ? voteValue : Number(voteValue);

  if (Number.isNaN(numericValue)) {
    return null;
  }

  return numericValue;
}

export async function getLinearOAuthStatus(
  roomKey: string,
  userName: string,
  sessionToken?: string | null,
): Promise<LinearOAuthStatus> {
  const token = resolveSessionToken(sessionToken);
  const response = await fetch(
    `${API_BASE_URL}/linear/oauth/status?roomKey=${encodeURIComponent(
      roomKey,
    )}&userName=${encodeURIComponent(userName)}&sessionToken=${encodeURIComponent(
      token,
    )}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch OAuth status");
  }

  return (await response.json()) as LinearOAuthStatus;
}

export async function authorizeLinearOAuth(
  roomKey: string,
  userName: string,
  sessionToken?: string | null,
): Promise<{ authorizationUrl: string }> {
  const token = resolveSessionToken(sessionToken);
  const response = await fetch(`${API_BASE_URL}/linear/oauth/authorize`, {
    method: "POST",
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
    throw new Error(errorData.error || "Failed to initiate OAuth");
  }

  return (await response.json()) as { authorizationUrl: string };
}

export async function revokeLinearOAuth(
  roomKey: string,
  userName: string,
  sessionToken?: string | null,
): Promise<void> {
  const token = resolveSessionToken(sessionToken);
  const response = await fetch(`${API_BASE_URL}/linear/oauth/revoke`, {
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
    throw new Error(errorData.error || "Failed to disconnect Linear");
  }
}

export interface SearchLinearOptions {
  query?: string;
  teamId?: string;
  stateId?: string;
  assigneeId?: string;
  first?: number;
  after?: string;
}

export interface SearchLinearResult {
  tickets: TicketMetadata[];
  hasNextPage: boolean;
  endCursor: string | null;
  totalCount: number;
}

export async function searchLinearIssues(
  options: SearchLinearOptions & {
    roomKey: string;
    userName: string;
    sessionToken?: string;
  },
): Promise<SearchLinearResult> {
  try {
    const sessionToken = resolveSessionToken(options.sessionToken);
    const params = new URLSearchParams({
      roomKey: options.roomKey,
      userName: options.userName,
      sessionToken,
    });

    if (options.query) params.append("query", options.query);
    if (options.teamId) params.append("teamId", options.teamId);
    if (options.stateId) params.append("stateId", options.stateId);
    if (options.assigneeId) params.append("assigneeId", options.assigneeId);
    if (options.first !== undefined)
      params.append("first", options.first.toString());
    if (options.after) params.append("after", options.after);

    const response = await fetch(
      `${API_BASE_URL}/linear/search?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error ||
        `Failed to search Linear issues: ${response.status}`,
      );
    }

    const data = (await response.json()) as SearchLinearResult;
    return data;
  } catch (error) {
    console.error("Error searching Linear issues:", error);
    throw error;
  }
}

export async function importLinearIssuesBatch(
  issueIds: string[],
  options: { roomKey: string; userName: string; sessionToken?: string },
): Promise<TicketMetadata[]> {
  try {
    const sessionToken = resolveSessionToken(options.sessionToken);
    const response = await fetch(`${API_BASE_URL}/linear/import-batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        issueIds,
        roomKey: options.roomKey,
        userName: options.userName,
        sessionToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error ||
        `Failed to import Linear issues: ${response.status}`,
      );
    }

    const data = await response.json();
    return data.tickets as TicketMetadata[];
  } catch (error) {
    console.error("Error importing Linear issues batch:", error);
    throw error;
  }
}

export interface LinearTeam {
  id: string;
  key: string;
  name: string;
}

export async function getLinearTeams(
  roomKey: string,
  userName: string,
  sessionToken?: string | null,
): Promise<LinearTeam[]> {
  try {
    const token = resolveSessionToken(sessionToken);
    const params = new URLSearchParams({
      roomKey,
      userName,
      sessionToken: token,
    });

    const response = await fetch(
      `${API_BASE_URL}/linear/teams?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Failed to fetch Linear teams: ${response.status}`,
      );
    }

    const data = await response.json();
    return data.teams as LinearTeam[];
  } catch (error) {
    console.error("Error fetching Linear teams:", error);
    throw error;
  }
}
