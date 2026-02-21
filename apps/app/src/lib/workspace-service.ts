import { API_BASE_URL } from "@/constants";

export interface WorkspaceUser {
  id: number;
  email: string;
  name: string | null;
  organisationId: number;
}

export interface WorkspaceOrganisation {
  id: number;
  domain: string;
  name: string;
  logoUrl: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceMember {
  id: number;
  email: string;
  name: string | null;
  createdAt: number;
  lastLoginAt: number | null;
}

export interface WorkspaceInvite {
  id: number;
  organisationId: number;
  email: string;
  invitedById: number;
  acceptedById: number | null;
  createdAt: number;
  updatedAt: number;
  acceptedAt: number | null;
  revokedAt: number | null;
}

export type MfaMethod = "totp" | "webauthn";

export type VerifyCodeResponse =
  | {
      status: "authenticated";
      user: WorkspaceUser;
      expiresAt: number;
      recoveryCodes?: string[];
    }
  | {
      status: "mfa_required";
      mode: "setup" | "verify";
      challengeToken: string;
      methods: MfaMethod[];
      reason?: "recovery_reset_required";
    };

export interface WebAuthnRegistrationOptions {
  rp: { id: string; name: string };
  user: { id: string; name: string; displayName: string };
  challenge: string;
  pubKeyCredParams: Array<{ type: "public-key"; alg: number }>;
  timeout: number;
  attestation: "none";
  authenticatorSelection: {
    residentKey: "preferred";
    userVerification: "preferred";
  };
}

export interface WebAuthnAuthenticationOptions {
  rpId: string;
  challenge: string;
  allowCredentials: Array<{ type: "public-key"; id: string }>;
  timeout: number;
  userVerification: "preferred";
}

export interface WebAuthnCredential {
  id: string;
  rawId: string;
  type: "public-key";
  clientExtensionResults: AuthenticationExtensionsClientOutputs;
  response: {
    clientDataJSON: string;
    attestationObject?: string;
    authenticatorData?: string;
    signature?: string;
    userHandle?: string;
  };
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
  updatedAt: number | null;
  completedAt: number | null;
  metadata: string | null;
}

export interface SessionTimelineData {
  period: string;
  yearMonth: string;
  count: number;
}

export interface WorkspaceStats {
  totalTeams: number;
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  sessionTimeline: SessionTimelineData[];
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

export interface WorkspaceInsights {
  totalVotes: number;
  totalRounds: number;
  totalTickets: number;
  participationRate: number;
  firstRoundConsensusRate: number;
  discussionRate: number;
  estimationVelocity: number | null;
  questionMarkRate: number;
  teamCount: number;
  sessionsAnalyzed: number;
  topContributors: Array<{
    userName: string;
    totalVotes: number;
    participationRate: number;
    consensusAlignment: number;
  }>;
}

export interface SessionStats {
  roomKey: string;
  totalRounds: number;
  totalVotes: number;
  uniqueParticipants: number;
  participationRate: number;
  consensusRate: number;
  firstRoundConsensusRate: number;
  discussionRate: number;
  estimationVelocity: number | null;
  durationMinutes: number | null;
}

export interface WorkspaceProfile {
  user: WorkspaceUser;
  organisation: WorkspaceOrganisation;
  teams: Team[];
  members: WorkspaceMember[];
  invites: WorkspaceInvite[];
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
): Promise<VerifyCodeResponse> {
  const data = await workspaceRequest<VerifyCodeResponse>(
    `${API_BASE_URL}/auth/verify`,
    {
      method: "POST",
      body: JSON.stringify({ email, code }),
    },
  );

  return data;
}

export async function startMfaSetup(
  challengeToken: string,
  method: MfaMethod,
): Promise<
  | { method: "totp"; secret: string; otpauthUrl: string }
  | { method: "webauthn"; options: WebAuthnRegistrationOptions }
> {
  return workspaceRequest(`${API_BASE_URL}/auth/mfa/setup/start`, {
    method: "POST",
    body: JSON.stringify({ challengeToken, method }),
  });
}

export async function verifyMfaSetup(
  challengeToken: string,
  method: MfaMethod,
  payload: { code?: string; credential?: WebAuthnCredential },
): Promise<VerifyCodeResponse> {
  return workspaceRequest(`${API_BASE_URL}/auth/mfa/setup/verify`, {
    method: "POST",
    body: JSON.stringify({ challengeToken, method, ...payload }),
  });
}

export async function startMfaVerify(
  challengeToken: string,
  method: "webauthn",
): Promise<{ method: "webauthn"; options: WebAuthnAuthenticationOptions }> {
  return workspaceRequest(`${API_BASE_URL}/auth/mfa/verify/start`, {
    method: "POST",
    body: JSON.stringify({ challengeToken, method }),
  });
}

export async function verifyMfa(
  challengeToken: string,
  method: "totp" | "webauthn" | "recovery",
  payload: { code?: string; credential?: WebAuthnCredential },
): Promise<VerifyCodeResponse> {
  return workspaceRequest(`${API_BASE_URL}/auth/mfa/verify`, {
    method: "POST",
    body: JSON.stringify({ challengeToken, method, ...payload }),
  });
}

export async function getCurrentUser(): Promise<WorkspaceProfile | null> {
  try {
    return await workspaceRequest<WorkspaceProfile>(`${API_BASE_URL}/auth/me`);
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

export async function getWorkspaceStats(): Promise<WorkspaceStats | null> {
  const data = await workspaceRequest<WorkspaceStats | null>(
    `${API_BASE_URL}/workspace/stats`,
  );
  return data;
}

export async function updateWorkspaceProfile(payload: {
  name?: string;
  logoUrl?: string | null;
}): Promise<WorkspaceOrganisation> {
  const data = await workspaceRequest<{ organisation: WorkspaceOrganisation }>(
    `${API_BASE_URL}/workspace/profile`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
  return data.organisation;
}

export async function inviteWorkspaceMember(
  email: string,
): Promise<WorkspaceInvite> {
  const data = await workspaceRequest<{ invite: WorkspaceInvite }>(
    `${API_BASE_URL}/workspace/invites`,
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
  );
  return data.invite;
}

export async function getTeamInsights(
  teamId: number,
  limit = 6,
): Promise<TeamInsights | null> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  const data = await workspaceRequest<TeamInsights | null>(
    `${API_BASE_URL}/stats/team/${teamId}/insights?${params.toString()}`,
  );
  return data;
}

export async function getWorkspaceInsights(
  sessionsLimit = 20,
  contributorsLimit = 10,
): Promise<WorkspaceInsights | null> {
  const params = new URLSearchParams();
  params.set("sessionsLimit", String(sessionsLimit));
  params.set("contributorsLimit", String(contributorsLimit));
  const data = await workspaceRequest<WorkspaceInsights | null>(
    `${API_BASE_URL}/stats/workspace/insights?${params.toString()}`,
  );
  return data;
}

export async function getSessionStats(
  roomKey: string,
): Promise<SessionStats | null> {
  const data = await workspaceRequest<SessionStats | null>(
    `${API_BASE_URL}/stats/session/${encodeURIComponent(roomKey)}`,
  );
  return data;
}

export async function getBatchSessionStats(
  roomKeys: string[],
): Promise<Record<string, SessionStats>> {
  if (roomKeys.length === 0) return {};
  const params = new URLSearchParams();
  params.set("keys", roomKeys.join(","));
  const data = await workspaceRequest<Record<string, SessionStats>>(
    `${API_BASE_URL}/stats/sessions?${params.toString()}`,
  );
  return data;
}

export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user;
}
