import { API_BASE_URL } from "@/constants";
import { readJsonSafe } from "@/lib/api-utils";
import { HttpError } from "@/lib/errors";
import {
  getWorkspaceErrorCode,
  getWorkspaceErrorMessage,
} from "@/lib/workspace-errors";
import type { RoomSettings } from "@/types";
import type {
  OAuthProvider,
  SessionStats,
  TeamAccessPolicy,
  TeamMember,
  TeamInsights,
  TeamIntegrationStatus,
  TeamSession,
  WorkspaceAuthProfile,
  WorkspaceMember,
  WorkspaceInsights,
  WorkspaceInvite,
  WorkspaceOrganisation,
  WorkspaceProfile,
  WorkspaceStats,
  WorkspaceTeam,
  WorkspaceRole,
  WorkspaceUser,
} from "@sprintjam/types";

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

  const parsed = await readJsonSafe(response);

  if (!response.ok) {
    const fallbackMessage =
      response.statusText || `Request failed: ${response.status}`;
    throw new HttpError({
      message: getWorkspaceErrorMessage(parsed, fallbackMessage),
      status: response.status,
      code: getWorkspaceErrorCode(parsed),
    });
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

export async function getCurrentUser(): Promise<WorkspaceAuthProfile | null> {
  try {
    return await workspaceRequest<WorkspaceAuthProfile>(
      `${API_BASE_URL}/auth/me`,
    );
  } catch {
    return null;
  }
}

export async function getWorkspaceProfile(): Promise<WorkspaceProfile> {
  return workspaceRequest<WorkspaceProfile>(
    `${API_BASE_URL}/workspace/profile`,
  );
}

export async function updateCurrentUserProfile(payload: {
  name: string;
  avatar: string | null;
}): Promise<WorkspaceUser> {
  const data = await workspaceRequest<{ user: WorkspaceUser }>(
    `${API_BASE_URL}/auth/me`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );

  return data.user;
}

export async function logout(): Promise<void> {
  await workspaceRequest(`${API_BASE_URL}/auth/logout`, { method: "POST" });
}

export async function listTeams(): Promise<WorkspaceTeam[]> {
  const data = await workspaceRequest<{ teams: WorkspaceTeam[] }>(
    `${API_BASE_URL}/teams`,
  );
  return data.teams;
}

export async function createTeam(
  name: string,
  accessPolicy: TeamAccessPolicy = "open",
): Promise<WorkspaceTeam> {
  const data = await workspaceRequest<{ team: WorkspaceTeam }>(
    `${API_BASE_URL}/teams`,
    {
      method: "POST",
      body: JSON.stringify({ name, accessPolicy }),
    },
  );
  return data.team;
}

export async function getTeam(teamId: number): Promise<WorkspaceTeam> {
  const data = await workspaceRequest<{ team: WorkspaceTeam }>(
    `${API_BASE_URL}/teams/${teamId}`,
  );
  return data.team;
}

export async function updateTeam(
  teamId: number,
  payload: { name?: string; accessPolicy?: TeamAccessPolicy },
): Promise<WorkspaceTeam> {
  const data = await workspaceRequest<{ team: WorkspaceTeam }>(
    `${API_BASE_URL}/teams/${teamId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
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

export async function getTeamSessionByRoomKey(
  roomKey: string,
): Promise<TeamSession | null> {
  try {
    const data = await workspaceRequest<{ session: TeamSession }>(
      `${API_BASE_URL}/sessions/by-room?roomKey=${encodeURIComponent(roomKey)}`,
    );
    return data.session;
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      return null;
    }
    throw error;
  }
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

export async function updateTeamSession(
  teamId: number,
  sessionId: number,
  payload: { name: string },
): Promise<TeamSession> {
  const data = await workspaceRequest<{ session: TeamSession }>(
    `${API_BASE_URL}/teams/${teamId}/sessions/${sessionId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
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
  requireMemberApproval?: boolean;
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

export async function approveWorkspaceMember(
  userId: number,
): Promise<WorkspaceMember> {
  const data = await workspaceRequest<{ member: WorkspaceMember }>(
    `${API_BASE_URL}/workspace/members/${userId}/approve`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
  return data.member;
}

export async function updateWorkspaceMemberRole(
  userId: number,
  role: WorkspaceRole,
): Promise<WorkspaceMember> {
  const data = await workspaceRequest<{ member: WorkspaceMember }>(
    `${API_BASE_URL}/workspace/members/${userId}`,
    {
      method: "PUT",
      body: JSON.stringify({ role }),
    },
  );
  return data.member;
}

export async function removeWorkspaceMember(userId: number): Promise<void> {
  await workspaceRequest(`${API_BASE_URL}/workspace/members/${userId}`, {
    method: "DELETE",
  });
}

export async function listTeamMembers(teamId: number): Promise<TeamMember[]> {
  const data = await workspaceRequest<{ members: TeamMember[] }>(
    `${API_BASE_URL}/teams/${teamId}/members`,
  );
  return data.members;
}

export async function addTeamMember(
  teamId: number,
  userId: number,
  role: "admin" | "member" = "member",
): Promise<TeamMember> {
  const data = await workspaceRequest<{ member: TeamMember }>(
    `${API_BASE_URL}/teams/${teamId}/members`,
    {
      method: "POST",
      body: JSON.stringify({ userId, role }),
    },
  );
  return data.member;
}

export async function requestTeamAccess(teamId: number): Promise<void> {
  await workspaceRequest<{ member: unknown }>(
    `${API_BASE_URL}/teams/${teamId}/request-access`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export async function approveTeamMember(
  teamId: number,
  userId: number,
): Promise<TeamMember> {
  const data = await workspaceRequest<{ member: TeamMember }>(
    `${API_BASE_URL}/teams/${teamId}/members/${userId}/approve`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
  return data.member;
}

export async function updateTeamMemberRole(
  teamId: number,
  userId: number,
  role: "admin" | "member",
): Promise<TeamMember> {
  const data = await workspaceRequest<{ member: TeamMember }>(
    `${API_BASE_URL}/teams/${teamId}/members/${userId}`,
    {
      method: "PUT",
      body: JSON.stringify({ role }),
    },
  );
  return data.member;
}

export async function removeTeamMember(
  teamId: number,
  userId: number,
): Promise<void> {
  await workspaceRequest(`${API_BASE_URL}/teams/${teamId}/members/${userId}`, {
    method: "DELETE",
  });
}

export async function moveTeamMember(
  sourceTeamId: number,
  userId: number,
  targetTeamId: number,
  role: "admin" | "member",
): Promise<TeamMember | null> {
  const data = await workspaceRequest<{
    member?: TeamMember | null;
    message: string;
  }>(`${API_BASE_URL}/teams/${sourceTeamId}/members/${userId}/move`, {
    method: "POST",
    body: JSON.stringify({ targetTeamId, role }),
  });

  return data.member ?? null;
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

export async function getTeamSettings(
  teamId: number,
): Promise<RoomSettings | null> {
  const data = await workspaceRequest<{ settings: RoomSettings | null }>(
    `${API_BASE_URL}/teams/${teamId}/settings`,
  );
  return data.settings;
}

export async function saveTeamSettings(
  teamId: number,
  settings: RoomSettings,
): Promise<RoomSettings> {
  const data = await workspaceRequest<{ settings: RoomSettings }>(
    `${API_BASE_URL}/teams/${teamId}/settings`,
    {
      method: "PUT",
      body: JSON.stringify({ settings }),
    },
  );
  return data.settings;
}

export async function listTeamIntegrations(
  teamId: number,
): Promise<TeamIntegrationStatus[]> {
  const data = await workspaceRequest<{
    integrations: TeamIntegrationStatus[];
  }>(`${API_BASE_URL}/teams/${teamId}/integrations`);
  return data.integrations;
}

export async function getTeamIntegrationStatus(
  teamId: number,
  provider: OAuthProvider,
): Promise<TeamIntegrationStatus> {
  const data = await workspaceRequest<{ status: TeamIntegrationStatus }>(
    `${API_BASE_URL}/teams/${teamId}/integrations/${provider}/status`,
  );
  return data.status;
}

export async function initiateTeamOAuth(
  teamId: number,
  provider: OAuthProvider,
): Promise<string> {
  const data = await workspaceRequest<{ authorizationUrl: string }>(
    `${API_BASE_URL}/teams/${teamId}/integrations/${provider}/authorize`,
    { method: "POST", body: JSON.stringify({}) },
  );
  return data.authorizationUrl;
}

export async function revokeTeamIntegration(
  teamId: number,
  provider: OAuthProvider,
): Promise<void> {
  await workspaceRequest(
    `${API_BASE_URL}/teams/${teamId}/integrations/${provider}`,
    { method: "DELETE" },
  );
}
