import type {
  LinearCycle,
  LinearOAuthStatus,
  LinearTeam,
} from "@sprintjam/types";

import type { TicketMetadata } from "@/types";
import { providerRequestJson, providerRequestVoid } from "@/lib/provider-api";

export async function fetchLinearIssue(
  issueId: string,
  options?: { roomKey?: string; userName?: string },
): Promise<TicketMetadata> {
  const data = await providerRequestJson<{ ticket?: TicketMetadata }>(
    "/linear/issue",
    {
      method: "POST",
      body: {
        issueId,
        roomKey: options?.roomKey,
        userName: options?.userName,
      },
      fallbackError: "Failed to fetch Linear issue",
      includeStatusInFallback: true,
    },
  );

  if (!data.ticket) {
    throw new Error("Invalid response format from Linear API");
  }

  return data.ticket;
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
  const data = await providerRequestJson<{ ticket: TicketMetadata }>(
    `/linear/issue/${encodeURIComponent(issueId)}/estimate`,
    {
      method: "PUT",
      body: {
        estimate,
        roomKey: options.roomKey,
        userName: options.userName,
        note: options.note,
      },
      fallbackError: "Failed to update Linear estimate",
      includeStatusInFallback: true,
    },
  );

  return data.ticket;
}

export async function fetchLinearTeams(
  roomKey: string,
  userName: string,
): Promise<LinearTeam[]> {
  const data = await providerRequestJson<{ teams?: LinearTeam[] }>(
    "/linear/teams",
    {
      method: "POST",
      body: { roomKey, userName },
      fallbackError: "Failed to fetch Linear teams",
    },
  );

  return data.teams ?? [];
}

export async function fetchLinearCycles(
  teamId: string,
  roomKey: string,
  userName: string,
): Promise<LinearCycle[]> {
  const data = await providerRequestJson<{ cycles?: LinearCycle[] }>(
    "/linear/cycles",
    {
      method: "POST",
      body: { teamId, roomKey, userName },
      fallbackError: "Failed to fetch Linear cycles",
    },
  );

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
  const data = await providerRequestJson<{ tickets?: TicketMetadata[] }>(
    "/linear/issues",
    {
      method: "POST",
      body: {
        teamId,
        roomKey,
        userName,
        cycleId: options.cycleId,
        query: options.search,
        limit: options.limit,
      },
      fallbackError: "Failed to fetch Linear issues",
    },
  );

  return data.tickets ?? [];
}

export async function getLinearOAuthStatus(
  roomKey: string,
  userName: string,
): Promise<LinearOAuthStatus> {
  return providerRequestJson<LinearOAuthStatus>("/linear/oauth/status", {
    method: "POST",
    body: { roomKey, userName },
    fallbackError: "Failed to fetch OAuth status",
  });
}

export async function authorizeLinearOAuth(
  roomKey: string,
  userName: string,
): Promise<{ authorizationUrl: string }> {
  return providerRequestJson<{ authorizationUrl: string }>(
    "/linear/oauth/authorize",
    {
      method: "POST",
      body: { roomKey, userName },
      fallbackError: "Failed to initiate OAuth",
    },
  );
}

export async function revokeLinearOAuth(
  roomKey: string,
  userName: string,
): Promise<void> {
  return providerRequestVoid("/linear/oauth/revoke", {
    method: "DELETE",
    body: { roomKey, userName },
    fallbackError: "Failed to disconnect Linear",
  });
}
