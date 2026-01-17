import { API_BASE_URL } from "@/constants";

export interface WorkspaceUser {
  id: number;
  email: string;
  name: string | null;
  organisationId: number;
}

export interface Team {
  id: number;
  name: string;
  organisationId: number;
  ownerId: number;
  createdAt: number;
  updatedAt?: number;
}

export interface TeamSession {
  id: number;
  teamId: number;
  roomKey: string;
  name: string;
  createdById: number;
  createdAt: number;
  completedAt: number | null;
  metadata: string | null;
}

export interface WorkspaceStats {
  totalTeams: number;
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
}

export interface TeamInsights {
  sessionsAnalyzed: number;
  totalTickets: number;
  totalRounds: number;
  participationRate: number;
  firstRoundConsensusRate: number;
  discussionRate: number;
  estimationVelocity: number | null;
  questionMarkRate: number;
}

export interface WorkspaceProfile {
  user: WorkspaceUser;
  teams: Team[];
}

export async function workspaceRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const errorMessage =
      (parsed as { error?: string })?.error ||
      response.statusText ||
      `Request failed: ${response.status}`;
    throw new Error(errorMessage);
  }

  return parsed as T;
}

export async function requestMagicLink(email: string): Promise<void> {
  await workspaceRequest<{ message: string }>(
    `${API_BASE_URL}/auth/magic-link`,
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
  );
}

export async function verifyCode(
  email: string,
  code: string,
): Promise<{ user: WorkspaceUser; expiresAt: number }> {
  const data = await workspaceRequest<{
    user: WorkspaceUser;
    expiresAt: number;
  }>(`${API_BASE_URL}/auth/verify`, {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });

  return data;
}

export async function getCurrentUser(): Promise<{
  user: WorkspaceUser;
  teams: Team[];
} | null> {
  try {
    return await workspaceRequest<{ user: WorkspaceUser; teams: Team[] }>(
      `${API_BASE_URL}/auth/me`,
    );
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await workspaceRequest(`${API_BASE_URL}/auth/logout`, { method: "POST" });
}

export async function listTeams(): Promise<Team[]> {
  const data = await workspaceRequest<{ teams: Team[] }>(
    `${API_BASE_URL}/teams`,
  );
  return data.teams;
}

export async function createTeam(name: string): Promise<Team> {
  const data = await workspaceRequest<{ team: Team }>(`${API_BASE_URL}/teams`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return data.team;
}

export async function getTeam(teamId: number): Promise<Team> {
  const data = await workspaceRequest<{ team: Team }>(
    `${API_BASE_URL}/teams/${teamId}`,
  );
  return data.team;
}

export async function updateTeam(teamId: number, name: string): Promise<Team> {
  const data = await workspaceRequest<{ team: Team }>(
    `${API_BASE_URL}/teams/${teamId}`,
    {
      method: "PUT",
      body: JSON.stringify({ name }),
    },
  );
  return data.team;
}

export async function deleteTeam(teamId: number): Promise<void> {
  await workspaceRequest(`${API_BASE_URL}/teams/${teamId}`, {
    method: "DELETE",
  });
}

export async function listTeamSessions(teamId: number): Promise<TeamSession[]> {
  const data = await workspaceRequest<{ sessions: TeamSession[] }>(
    `${API_BASE_URL}/teams/${teamId}/sessions`,
  );
  return data.sessions;
}

export async function createTeamSession(
  teamId: number,
  name: string,
  roomKey: string,
  metadata?: Record<string, unknown>,
): Promise<TeamSession> {
  const data = await workspaceRequest<{ session: TeamSession }>(
    `${API_BASE_URL}/teams/${teamId}/sessions`,
    {
      method: "POST",
      body: JSON.stringify({ name, roomKey, metadata }),
    },
  );
  return data.session;
}

export async function getTeamSession(
  teamId: number,
  sessionId: number,
): Promise<TeamSession> {
  const data = await workspaceRequest<{ session: TeamSession }>(
    `${API_BASE_URL}/teams/${teamId}/sessions/${sessionId}`,
  );
  return data.session;
}

export async function completeSessionByRoomKey(
  roomKey: string,
): Promise<TeamSession> {
  const data = await workspaceRequest<{ session: TeamSession }>(
    `${API_BASE_URL}/sessions/complete`,
    {
      method: "POST",
      body: JSON.stringify({ roomKey }),
    },
  );
  return data.session;
}

export async function getWorkspaceStats(): Promise<WorkspaceStats> {
  const data = await workspaceRequest<{ stats: WorkspaceStats }>(
    `${API_BASE_URL}/workspace/stats`,
  );
  return data.stats;
}

export async function getTeamInsights(
  teamId: number,
  limit = 6,
): Promise<TeamInsights> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  const data = await workspaceRequest<{ insights: TeamInsights }>(
    `${API_BASE_URL}/stats/team/${teamId}/insights?${params.toString()}`,
  );
  return data.insights;
}

export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user;
}
