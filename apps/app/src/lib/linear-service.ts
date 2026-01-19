import type { VoteValue, TicketMetadata } from "@/types";
import { API_BASE_URL } from '@/constants';

export interface LinearOAuthStatus {
  connected: boolean;
  linearOrganizationId?: string;
  linearUserEmail?: string;
  expiresAt?: number;
  estimateField?: string | null;
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
}

export interface LinearCycle {
  id: string;
  number: number;
  name?: string;
  startsAt?: string | null;
  endsAt?: string | null;
}

export async function fetchLinearIssue(
  issueId: string,
  options?: { roomKey?: string; userName?: string },
): Promise<TicketMetadata> {
  try {
    const response = await fetch(`${API_BASE_URL}/linear/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        issueId,
        roomKey: options?.roomKey,
        userName: options?.userName,
      }),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Failed to fetch Linear issue: ${response.status}`,
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
  options: {
    roomKey: string;
    userName: string;
    note?: string;
  },
): Promise<TicketMetadata> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/linear/issue/${encodeURIComponent(issueId)}/estimate`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estimate,
          roomKey: options.roomKey,
          userName: options.userName,
          note: options.note,
        }),
        credentials: 'include',
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
    console.error('Error updating Linear estimate:', error);
    throw error;
  }
}

export async function fetchLinearTeams(
  roomKey: string,
  userName: string,
): Promise<LinearTeam[]> {
  const response = await fetch(`${API_BASE_URL}/linear/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomKey, userName }),
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error || 'Failed to fetch Linear teams',
    );
  }

  const data = (await response.json()) as { teams?: LinearTeam[] };
  return data.teams ?? [];
}

export async function fetchLinearCycles(
  teamId: string,
  roomKey: string,
  userName: string,
): Promise<LinearCycle[]> {
  const response = await fetch(`${API_BASE_URL}/linear/cycles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId, roomKey, userName }),
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error ||
        'Failed to fetch Linear cycles',
    );
  }

  const data = (await response.json()) as { cycles?: LinearCycle[] };
  return data.cycles ?? [];
}

export async function fetchLinearIssues(
  teamId: string,
  options: {
    cycleId?: string | null;
    limit?: number | null;
    search?: string | null;
  },
  roomKey: string,
  userName: string,
): Promise<TicketMetadata[]> {
  const response = await fetch(`${API_BASE_URL}/linear/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      teamId,
      roomKey,
      userName,
      cycleId: options.cycleId,
      query: options.search,
      limit: options.limit,
    }),
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error ||
        'Failed to fetch Linear issues',
    );
  }

  const data = (await response.json()) as { tickets?: TicketMetadata[] };
  return data.tickets ?? [];
}

export function convertVoteValueToEstimate(
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

export async function getLinearOAuthStatus(
  roomKey: string,
  userName: string,
): Promise<LinearOAuthStatus> {
  const response = await fetch(`${API_BASE_URL}/linear/oauth/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomKey, userName }),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch OAuth status');
  }

  return (await response.json()) as LinearOAuthStatus;
}

export async function authorizeLinearOAuth(
  roomKey: string,
  userName: string,
): Promise<{ authorizationUrl: string }> {
  const response = await fetch(`${API_BASE_URL}/linear/oauth/authorize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      roomKey,
      userName,
    }),
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to initiate OAuth');
  }

  return (await response.json()) as { authorizationUrl: string };
}

export async function revokeLinearOAuth(
  roomKey: string,
  userName: string,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/linear/oauth/revoke`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      roomKey,
      userName,
    }),
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to disconnect Linear');
  }
}
