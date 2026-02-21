import type { TicketMetadata } from "@/types";
import { API_BASE_URL } from "@/constants";

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
  const response = await fetch(`${API_BASE_URL}/github/issue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      issueId,
      roomKey: options?.roomKey,
      userName: options?.userName,
    }),
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error ||
        `Failed to fetch GitHub issue: ${response.status}`,
    );
  }

  const data = (await response.json()) as { ticket?: TicketMetadata };
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
  const encodedId = encodeURIComponent(issueId);

  const response = await fetch(
    `${API_BASE_URL}/github/issue/${encodedId}/estimate`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        estimate,
        roomKey: options.roomKey,
        userName: options.userName,
        note: options.note,
      }),
      credentials: "include",
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error ||
        `Failed to sync GitHub estimate: ${response.status}`,
    );
  }

  const data = (await response.json()) as { ticket: TicketMetadata };
  return data.ticket;
}

export async function getGithubOAuthStatus(
  roomKey: string,
  userName: string,
): Promise<GithubOAuthStatus> {
  const response = await fetch(`${API_BASE_URL}/github/oauth/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomKey, userName }),
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ||
        "Failed to fetch GitHub OAuth status",
    );
  }

  return (await response.json()) as GithubOAuthStatus;
}

export async function authorizeGithubOAuth(
  roomKey: string,
  userName: string,
): Promise<{ authorizationUrl: string }> {
  const response = await fetch(`${API_BASE_URL}/github/oauth/authorize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomKey,
      userName,
    }),
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error || "Failed to initiate GitHub OAuth",
    );
  }

  return (await response.json()) as { authorizationUrl: string };
}

export async function revokeGithubOAuth(
  roomKey: string,
  userName: string,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/github/oauth/revoke`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomKey,
      userName,
    }),
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error || "Failed to disconnect GitHub OAuth",
    );
  }
}

export async function fetchGithubRepos(
  roomKey: string,
  userName: string,
): Promise<GithubRepo[]> {
  const response = await fetch(`${API_BASE_URL}/github/repos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomKey, userName }),
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error || "Failed to fetch GitHub repos",
    );
  }

  const result = (await response.json()) as { repos?: GithubRepo[] };
  return result.repos ?? [];
}

export async function fetchGithubMilestones(
  repo: string,
  roomKey: string,
  userName: string,
): Promise<GithubMilestone[]> {
  const response = await fetch(`${API_BASE_URL}/github/milestones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo, roomKey, userName }),
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error || "Failed to fetch GitHub milestones",
    );
  }

  const result = (await response.json()) as {
    milestones?: GithubMilestone[];
  };
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
  const response = await fetch(`${API_BASE_URL}/github/issues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      repo,
      roomKey,
      userName,
      milestoneNumber: options.milestoneNumber,
      milestoneTitle: options.milestoneTitle,
      query: options.search,
      limit: options.limit,
    }),
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error || "Failed to fetch GitHub issues",
    );
  }

  const result = (await response.json()) as { tickets?: TicketMetadata[] };
  return result.tickets ?? [];
}
