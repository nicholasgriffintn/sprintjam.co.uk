import type { TicketMetadata } from "@/types";
import { providerRequestJson, providerRequestVoid } from "@/lib/provider-api";

export interface GithubOAuthStatus {
  connected: boolean;
  githubLogin?: string | null;
  githubUserEmail?: string | null;
  defaultOwner?: string | null;
  defaultRepo?: string | null;
  expiresAt?: number;
}

export interface GithubRepo {
  id: string;
  name: string;
  fullName: string;
  owner: string;
}

export interface GithubMilestone {
  id: string;
  number: number;
  title: string;
  state?: string;
}

export async function fetchGithubIssue(
  issueId: string,
  options?: { roomKey?: string; userName?: string },
): Promise<TicketMetadata> {
  const data = await providerRequestJson<{ ticket?: TicketMetadata }>(
    "/github/issue",
    {
      method: "POST",
      body: {
        issueId,
        roomKey: options?.roomKey,
        userName: options?.userName,
      },
      fallbackError: "Failed to fetch GitHub issue",
      includeStatusInFallback: true,
    },
  );

  if (!data.ticket) {
    throw new Error("Invalid response format from GitHub API");
  }
  return data.ticket;
}

export async function updateGithubEstimate(
  issueId: string,
  estimate: number,
  options: {
    roomKey: string;
    userName: string;
    note?: string;
  },
): Promise<TicketMetadata> {
  const data = await providerRequestJson<{ ticket: TicketMetadata }>(
    `/github/issue/${encodeURIComponent(issueId)}/estimate`,
    {
      method: "PUT",
      body: {
        estimate,
        roomKey: options.roomKey,
        userName: options.userName,
        note: options.note,
      },
      fallbackError: "Failed to sync GitHub estimate",
      includeStatusInFallback: true,
    },
  );

  return data.ticket;
}

export async function getGithubOAuthStatus(
  roomKey: string,
  userName: string,
): Promise<GithubOAuthStatus> {
  return providerRequestJson<GithubOAuthStatus>("/github/oauth/status", {
    method: "POST",
    body: { roomKey, userName },
    fallbackError: "Failed to fetch GitHub OAuth status",
  });
}

export async function authorizeGithubOAuth(
  roomKey: string,
  userName: string,
): Promise<{ authorizationUrl: string }> {
  return providerRequestJson<{ authorizationUrl: string }>(
    "/github/oauth/authorize",
    {
      method: "POST",
      body: { roomKey, userName },
      fallbackError: "Failed to initiate GitHub OAuth",
    },
  );
}

export async function revokeGithubOAuth(
  roomKey: string,
  userName: string,
): Promise<void> {
  return providerRequestVoid("/github/oauth/revoke", {
    method: "DELETE",
    body: { roomKey, userName },
    fallbackError: "Failed to disconnect GitHub OAuth",
  });
}

export async function fetchGithubRepos(
  roomKey: string,
  userName: string,
): Promise<GithubRepo[]> {
  const result = await providerRequestJson<{ repos?: GithubRepo[] }>(
    "/github/repos",
    {
      method: "POST",
      body: { roomKey, userName },
      fallbackError: "Failed to fetch GitHub repos",
    },
  );

  return result.repos ?? [];
}

export async function fetchGithubMilestones(
  repo: string,
  roomKey: string,
  userName: string,
): Promise<GithubMilestone[]> {
  const result = await providerRequestJson<{ milestones?: GithubMilestone[] }>(
    "/github/milestones",
    {
      method: "POST",
      body: { repo, roomKey, userName },
      fallbackError: "Failed to fetch GitHub milestones",
    },
  );

  return result.milestones ?? [];
}

export async function fetchGithubRepoIssues(
  repo: string,
  options: {
    milestoneNumber?: number | null;
    milestoneTitle?: string | null;
    limit?: number | null;
    search?: string | null;
  },
  roomKey: string,
  userName: string,
): Promise<TicketMetadata[]> {
  const result = await providerRequestJson<{ tickets?: TicketMetadata[] }>(
    "/github/issues",
    {
      method: "POST",
      body: {
        repo,
        roomKey,
        userName,
        milestoneNumber: options.milestoneNumber,
        milestoneTitle: options.milestoneTitle,
        query: options.search,
        limit: options.limit,
      },
      fallbackError: "Failed to fetch GitHub issues",
    },
  );

  return result.tickets ?? [];
}
