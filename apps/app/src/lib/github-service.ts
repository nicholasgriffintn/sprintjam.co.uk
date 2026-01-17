import type { TicketMetadata } from "@/types";
import { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY } from "@/constants";
import { safeLocalStorage } from "@/utils/storage";

function resolveSessionToken(provided?: string | null): string {
  if (provided) return provided;
  const stored = safeLocalStorage.get(AUTH_TOKEN_STORAGE_KEY);
  if (!stored) {
    throw new Error("Missing session token. Please rejoin the room.");
  }
  return stored;
}

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
  options?: { roomKey?: string; userName?: string; sessionToken?: string },
): Promise<TicketMetadata> {
  const sessionToken = resolveSessionToken(options?.sessionToken);
  const params = new URLSearchParams();
  params.set("issueId", issueId);

  if (options?.roomKey && options?.userName) {
    params.set("roomKey", options.roomKey);
    params.set("userName", options.userName);
    params.set("sessionToken", sessionToken);
  }

  const response = await fetch(
    `${API_BASE_URL}/github/issue?${params.toString()}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
  );

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
    sessionToken?: string;
    note?: string;
  },
): Promise<TicketMetadata> {
  const sessionToken = resolveSessionToken(options.sessionToken);
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
          sessionToken,
          note: options.note,
        }),
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
  sessionToken?: string | null,
): Promise<GithubOAuthStatus> {
  const token = resolveSessionToken(sessionToken);
  const response = await fetch(
    `${API_BASE_URL}/github/oauth/status?roomKey=${encodeURIComponent(
      roomKey,
    )}&userName=${encodeURIComponent(userName)}&sessionToken=${encodeURIComponent(
      token,
    )}`,
  );

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
  sessionToken?: string | null
): Promise<{ authorizationUrl: string }> {
  const token = resolveSessionToken(sessionToken);
  const response = await fetch(`${API_BASE_URL}/github/oauth/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomKey,
      userName,
      sessionToken: token,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error || 'Failed to initiate GitHub OAuth'
    );
  }

  return (await response.json()) as { authorizationUrl: string };
}

export async function revokeGithubOAuth(
  roomKey: string,
  userName: string,
  sessionToken?: string | null,
): Promise<void> {
  const token = resolveSessionToken(sessionToken);
  const response = await fetch(`${API_BASE_URL}/github/oauth/revoke`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomKey,
      userName,
      sessionToken: token,
    }),
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
  sessionToken?: string | null,
): Promise<GithubRepo[]> {
  const token = resolveSessionToken(sessionToken);
  const response = await fetch(
    `${API_BASE_URL}/github/repos?roomKey=${encodeURIComponent(
      roomKey,
    )}&userName=${encodeURIComponent(userName)}&sessionToken=${encodeURIComponent(
      token,
    )}`,
  );

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
  sessionToken?: string | null,
): Promise<GithubMilestone[]> {
  const token = resolveSessionToken(sessionToken);
  const params = new URLSearchParams();
  params.set("repo", repo);
  params.set("roomKey", roomKey);
  params.set("userName", userName);
  params.set("sessionToken", token);

  const response = await fetch(
    `${API_BASE_URL}/github/milestones?${params.toString()}`,
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ||
        "Failed to fetch GitHub milestones",
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
  sessionToken?: string | null,
): Promise<TicketMetadata[]> {
  const token = resolveSessionToken(sessionToken);
  const params = new URLSearchParams();
  params.set("repo", repo);
  params.set("roomKey", roomKey);
  params.set("userName", userName);
  params.set("sessionToken", token);
  if (options.milestoneNumber !== undefined && options.milestoneNumber !== null) {
    params.set("milestoneNumber", String(options.milestoneNumber));
  }
  if (options.milestoneTitle) {
    params.set("milestoneTitle", options.milestoneTitle);
  }
  if (options.search) {
    params.set("query", options.search);
  }
  if (options.limit) {
    params.set("limit", String(options.limit));
  }

  const response = await fetch(
    `${API_BASE_URL}/github/issues?${params.toString()}`,
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ||
        "Failed to fetch GitHub issues",
    );
  }

  const result = (await response.json()) as { tickets?: TicketMetadata[] };
  return result.tickets ?? [];
}
