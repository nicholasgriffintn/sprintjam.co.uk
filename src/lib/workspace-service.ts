import { API_BASE_URL, WORKSPACE_TOKEN_STORAGE_KEY } from "@/constants";
import { safeLocalStorage } from "@/utils/storage";

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

function getAuthToken(): string | null {
  return safeLocalStorage.get(WORKSPACE_TOKEN_STORAGE_KEY);
}

function setAuthToken(token: string): void {
  safeLocalStorage.set(WORKSPACE_TOKEN_STORAGE_KEY, token);
}

function removeAuthToken(): void {
  safeLocalStorage.remove(WORKSPACE_TOKEN_STORAGE_KEY);
}

async function fetchWithAuth<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${response.status}`);
  }

  return response.json();
}

export async function requestMagicLink(email: string): Promise<void> {
  await fetchWithAuth<{ message: string }>(`${API_BASE_URL}/auth/magic-link`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function verifyMagicLink(
  token: string,
): Promise<{ user: WorkspaceUser; sessionToken: string; expiresAt: number }> {
  const data = await fetchWithAuth<{
    user: WorkspaceUser;
    sessionToken: string;
    expiresAt: number;
  }>(`${API_BASE_URL}/auth/verify`, {
    method: "POST",
    body: JSON.stringify({ token }),
  });

  setAuthToken(data.sessionToken);
  return data;
}

export async function getCurrentUser(): Promise<{
  user: WorkspaceUser;
  teams: Team[];
} | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    return await fetchWithAuth<{ user: WorkspaceUser; teams: Team[] }>(
      `${API_BASE_URL}/auth/me`,
    );
  } catch {
    removeAuthToken();
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await fetchWithAuth(`${API_BASE_URL}/auth/logout`, { method: "POST" });
  } finally {
    removeAuthToken();
  }
}

export async function listTeams(): Promise<Team[]> {
  const data = await fetchWithAuth<{ teams: Team[] }>(`${API_BASE_URL}/teams`);
  return data.teams;
}

export async function createTeam(name: string): Promise<Team> {
  const data = await fetchWithAuth<{ team: Team }>(`${API_BASE_URL}/teams`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return data.team;
}

export async function getTeam(teamId: number): Promise<Team> {
  const data = await fetchWithAuth<{ team: Team }>(
    `${API_BASE_URL}/teams/${teamId}`,
  );
  return data.team;
}

export async function updateTeam(teamId: number, name: string): Promise<Team> {
  const data = await fetchWithAuth<{ team: Team }>(
    `${API_BASE_URL}/teams/${teamId}`,
    {
      method: "PUT",
      body: JSON.stringify({ name }),
    },
  );
  return data.team;
}

export async function deleteTeam(teamId: number): Promise<void> {
  await fetchWithAuth(`${API_BASE_URL}/teams/${teamId}`, { method: "DELETE" });
}

export async function listTeamSessions(teamId: number): Promise<TeamSession[]> {
  const data = await fetchWithAuth<{ sessions: TeamSession[] }>(
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
  const data = await fetchWithAuth<{ session: TeamSession }>(
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
  const data = await fetchWithAuth<{ session: TeamSession }>(
    `${API_BASE_URL}/teams/${teamId}/sessions/${sessionId}`,
  );
  return data.session;
}

export async function getWorkspaceStats(): Promise<WorkspaceStats> {
  const data = await fetchWithAuth<{ stats: WorkspaceStats }>(
    `${API_BASE_URL}/workspace/stats`,
  );
  return data.stats;
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

export { getAuthToken, setAuthToken, removeAuthToken };
