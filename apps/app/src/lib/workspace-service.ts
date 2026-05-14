import { API_BASE_URL } from "@/constants";
import { readJsonSafe } from "@/lib/api-utils";
import { HttpError } from "@/lib/errors";
import {
  getWorkspaceErrorCode,
  getWorkspaceErrorMessage,
} from "@/lib/workspace-errors";
import type { RoomSettings } from "@/types";
import type {
  ExternalBoardOption,
  ExternalSprintOption,
  ExternalTicketMetadata,
  OAuthProvider,
  CreateWorkspaceActionInput,
  RecordPlanningWorkspaceActionsInput,
  RecordRetroWorkspaceActionsInput,
  RecordStandupSessionStatsInput,
  RecordStandupWorkspaceActionsInput,
  RecordWheelSessionStatsInput,
  SessionStats,
  SaveTeamsCollaborationInstallationInput,
  TeamAccessPolicy,
  TeamCollaborationInstallation,
  TeamMember,
  TeamInsights,
  TeamIntegrationStatus,
  TeamSession,
  TeamSessionsPage,
  UpdateWorkspaceActionInput,
  WorkspaceActionsPage,
  WorkspaceActionSourceFilter,
  WorkspaceActionStatusFilter,
  WorkspaceTeamSessionFilter,
  WorkspaceProcessLoop,
  WorkspaceMember,
  WorkspaceInsights,
  WorkspaceInvite,
  WorkspaceOrganisation,
  WorkspaceAuthProfile,
  WorkspaceProfile,
  WorkspaceStats,
  WorkspaceTeam,
  WorkspaceRole,
  WorkspaceUser,
  SpinResult,
  WheelMode,
  RetroSettings,
} from "@sprintjam/types";
import type { LinkedSessionRecapActionKind } from "@sprintjam/utils";

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

export async function getWorkspaceProfile(): Promise<WorkspaceProfile> {
  return workspaceRequest<WorkspaceProfile>(
    `${API_BASE_URL}/workspace/profile`,
  );
}

export async function getWorkspaceAuthProfile(): Promise<WorkspaceAuthProfile> {
  return workspaceRequest<WorkspaceAuthProfile>(`${API_BASE_URL}/auth/me`);
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
  logoUrl: string | null = null,
): Promise<WorkspaceTeam> {
  const data = await workspaceRequest<{ team: WorkspaceTeam }>(
    `${API_BASE_URL}/teams`,
    {
      method: "POST",
      body: JSON.stringify({ name, accessPolicy, logoUrl }),
    },
  );
  return data.team;
}

export async function getTeam(teamSlug: string): Promise<WorkspaceTeam> {
  const data = await workspaceRequest<{ team: WorkspaceTeam }>(
    `${API_BASE_URL}/teams/${teamSlug}`,
  );
  return data.team;
}

export async function updateTeam(
  teamSlug: string,
  payload: {
    name?: string;
    accessPolicy?: TeamAccessPolicy;
    logoUrl?: string | null;
  },
): Promise<WorkspaceTeam> {
  const data = await workspaceRequest<{ team: WorkspaceTeam }>(
    `${API_BASE_URL}/teams/${teamSlug}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
  return data.team;
}

export async function deleteTeam(teamSlug: string): Promise<void> {
  await workspaceRequest(`${API_BASE_URL}/teams/${teamSlug}`, {
    method: "DELETE",
  });
}

export async function listTeamSessionsPage(
  teamSlug: string,
  options: {
    limit?: number;
    offset?: number;
    type?: WorkspaceTeamSessionFilter;
  } = {},
): Promise<TeamSessionsPage> {
  const params = new URLSearchParams();
  if (options.limit !== undefined) {
    params.set("limit", String(options.limit));
  }
  if (options.offset !== undefined) {
    params.set("offset", String(options.offset));
  }
  if (options.type !== undefined) {
    params.set("type", options.type);
  }

  const query = params.toString();
  return workspaceRequest<TeamSessionsPage>(
    `${API_BASE_URL}/teams/${teamSlug}/sessions${query ? `?${query}` : ""}`,
  );
}

export async function listWorkspaceProcessLoops(
  teamSlug: string,
): Promise<WorkspaceProcessLoop[]> {
  const data = await workspaceRequest<{ loops: WorkspaceProcessLoop[] }>(
    `${API_BASE_URL}/teams/${teamSlug}/process-loops`,
  );
  return data.loops;
}

export async function listWorkspaceActionsPage(
  teamSlug: string,
  options: {
    limit?: number;
    offset?: number;
    status?: WorkspaceActionStatusFilter;
    source?: WorkspaceActionSourceFilter;
    processLoopId?: number;
  } = {},
): Promise<WorkspaceActionsPage> {
  const params = new URLSearchParams({
    limit: String(options.limit ?? 50),
    offset: String(options.offset ?? 0),
    status: options.status ?? "all",
    source: options.source ?? "all",
  });
  if (options.processLoopId !== undefined) {
    params.set("processLoopId", String(options.processLoopId));
  }

  return workspaceRequest<WorkspaceActionsPage>(
    `${API_BASE_URL}/teams/${teamSlug}/actions?${params.toString()}`,
  );
}

export async function createWorkspaceAction(
  teamSlug: string,
  payload: CreateWorkspaceActionInput,
) {
  const data = await workspaceRequest<{
    action: WorkspaceActionsPage["actions"][number];
  }>(`${API_BASE_URL}/teams/${teamSlug}/actions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.action;
}

export async function updateWorkspaceAction(
  teamSlug: string,
  actionId: number,
  payload: UpdateWorkspaceActionInput,
) {
  const data = await workspaceRequest<{
    action: WorkspaceActionsPage["actions"][number];
  }>(`${API_BASE_URL}/teams/${teamSlug}/actions/${actionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return data.action;
}

export async function listTeamSessions(
  teamSlug: string,
): Promise<TeamSession[]> {
  const data = await listTeamSessionsPage(teamSlug);
  return data.sessions;
}

export async function createTeamSession(
  teamSlug: string,
  name: string,
  roomKey: string,
  metadata?: Record<string, unknown>,
): Promise<TeamSession> {
  const type = metadata?.type;
  const path =
    type === "standup"
      ? "standups/workspace-sessions"
      : type === "wheel"
        ? "wheels/workspace-sessions"
        : type === "retro"
          ? "retros/workspace-sessions"
          : "rooms/workspace-sessions";
  const data = await workspaceRequest<{ session: TeamSession }>(
    `${API_BASE_URL}/${path}`,
    {
      method: "POST",
      body: JSON.stringify({ teamSlug, name, roomKey, metadata }),
    },
  );
  return data.session;
}

export async function getTeamSessionByRoomKey(
  roomKey: string,
): Promise<TeamSession | null> {
  try {
    const data = await workspaceRequest<{ session: TeamSession | null }>(
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
  teamSlug: string,
  sessionId: number,
): Promise<TeamSession> {
  const data = await workspaceRequest<{ session: TeamSession }>(
    `${API_BASE_URL}/teams/${teamSlug}/sessions/${sessionId}`,
  );
  return data.session;
}

export async function updateTeamSession(
  teamSlug: string,
  sessionId: number,
  payload: { name: string },
): Promise<TeamSession> {
  const data = await workspaceRequest<{ session: TeamSession }>(
    `${API_BASE_URL}/teams/${teamSlug}/sessions/${sessionId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
  return data.session;
}

export async function resolveTeamSessionRecapAction(
  teamSlug: string,
  sessionId: number,
  payload: { actionId: string; kind: LinkedSessionRecapActionKind },
): Promise<TeamSession> {
  const data = await workspaceRequest<{ session: TeamSession }>(
    `${API_BASE_URL}/teams/${teamSlug}/sessions/${sessionId}/recap-actions/resolve`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return data.session;
}

export async function completeSessionByRoomKey(
  roomKey: string,
  type: "planning" | "standup" | "retro" = "planning",
): Promise<TeamSession> {
  const path =
    type === "standup"
      ? "standups/workspace-sessions/complete"
      : type === "retro"
        ? "retros/workspace-sessions/complete"
        : "rooms/workspace-sessions/complete";
  const data = await workspaceRequest<{ session: TeamSession }>(
    `${API_BASE_URL}/${path}`,
    {
      method: "POST",
      body: JSON.stringify({ roomKey }),
    },
  );
  return data.session;
}

export async function recordWheelOutcomeByRoomKey(
  roomKey: string,
  mode: WheelMode,
  result: SpinResult,
): Promise<TeamSession> {
  const data = await workspaceRequest<{ session: TeamSession }>(
    `${API_BASE_URL}/wheels/workspace-outcomes`,
    {
      method: "POST",
      body: JSON.stringify({ roomKey, mode, result }),
    },
  );
  return data.session;
}

export async function recordPlanningActionsByRoomKey(
  payload: RecordPlanningWorkspaceActionsInput,
): Promise<number[]> {
  const data = await workspaceRequest<{ actionIds: number[] }>(
    `${API_BASE_URL}/rooms/workspace-actions`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return data.actionIds;
}

export async function recordRetroActionsByRoomKey(
  payload: RecordRetroWorkspaceActionsInput,
): Promise<number[]> {
  const data = await workspaceRequest<{ actionIds: number[] }>(
    `${API_BASE_URL}/retros/workspace-actions`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return data.actionIds;
}

export async function recordStandupActionsByRoomKey(
  payload: RecordStandupWorkspaceActionsInput,
): Promise<number[]> {
  const data = await workspaceRequest<{ actionIds: number[] }>(
    `${API_BASE_URL}/standups/workspace-actions`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return data.actionIds;
}

export async function recordStandupSessionStats(
  payload: RecordStandupSessionStatsInput,
): Promise<void> {
  await workspaceRequest(`${API_BASE_URL}/standups/session-stats`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function recordWheelSessionStats(
  payload: RecordWheelSessionStatsInput,
): Promise<void> {
  await workspaceRequest(`${API_BASE_URL}/wheels/session-stats`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
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

export async function listTeamMembers(teamSlug: string): Promise<TeamMember[]> {
  const data = await workspaceRequest<{ members: TeamMember[] }>(
    `${API_BASE_URL}/teams/${teamSlug}/members`,
  );
  return data.members;
}

export async function addTeamMember(
  teamSlug: string,
  userId: number,
  role: "admin" | "member" = "member",
): Promise<TeamMember> {
  const data = await workspaceRequest<{ member: TeamMember }>(
    `${API_BASE_URL}/teams/${teamSlug}/members`,
    {
      method: "POST",
      body: JSON.stringify({ userId, role }),
    },
  );
  return data.member;
}

export async function requestTeamAccess(teamSlug: string): Promise<void> {
  await workspaceRequest<{ member: unknown }>(
    `${API_BASE_URL}/teams/${teamSlug}/request-access`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export async function approveTeamMember(
  teamSlug: string,
  userId: number,
): Promise<TeamMember> {
  const data = await workspaceRequest<{ member: TeamMember }>(
    `${API_BASE_URL}/teams/${teamSlug}/members/${userId}/approve`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
  return data.member;
}

export async function updateTeamMemberRole(
  teamSlug: string,
  userId: number,
  role: "admin" | "member",
): Promise<TeamMember> {
  const data = await workspaceRequest<{ member: TeamMember }>(
    `${API_BASE_URL}/teams/${teamSlug}/members/${userId}`,
    {
      method: "PUT",
      body: JSON.stringify({ role }),
    },
  );
  return data.member;
}

export async function removeTeamMember(
  teamSlug: string,
  userId: number,
): Promise<void> {
  await workspaceRequest(
    `${API_BASE_URL}/teams/${teamSlug}/members/${userId}`,
    {
      method: "DELETE",
    },
  );
}

export async function moveTeamMember(
  sourceTeamSlug: string,
  userId: number,
  targetTeamId: number,
  role: "admin" | "member",
): Promise<TeamMember | null> {
  const data = await workspaceRequest<{
    member?: TeamMember | null;
    message: string;
  }>(`${API_BASE_URL}/teams/${sourceTeamSlug}/members/${userId}/move`, {
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

export async function getTeamSettings(
  teamSlug: string,
): Promise<RoomSettings | null> {
  const data = await workspaceRequest<{ settings: RoomSettings | null }>(
    `${API_BASE_URL}/teams/${teamSlug}/settings`,
  );
  return data.settings;
}

export async function saveTeamSettings(
  teamSlug: string,
  settings: RoomSettings,
): Promise<RoomSettings> {
  const data = await workspaceRequest<{ settings: RoomSettings }>(
    `${API_BASE_URL}/teams/${teamSlug}/settings`,
    {
      method: "PUT",
      body: JSON.stringify({ settings }),
    },
  );
  return data.settings;
}

export async function getTeamRetroSettings(
  teamSlug: string,
): Promise<RetroSettings | null> {
  const data = await workspaceRequest<{ settings: RetroSettings | null }>(
    `${API_BASE_URL}/teams/${teamSlug}/retro-settings`,
  );
  return data.settings;
}

export async function saveTeamRetroSettings(
  teamSlug: string,
  settings: RetroSettings,
): Promise<RetroSettings> {
  const data = await workspaceRequest<{ settings: RetroSettings }>(
    `${API_BASE_URL}/teams/${teamSlug}/retro-settings`,
    {
      method: "PUT",
      body: JSON.stringify({ settings }),
    },
  );
  return data.settings;
}

export async function listTeamIntegrations(
  teamSlug: string,
): Promise<TeamIntegrationStatus[]> {
  const data = await workspaceRequest<{
    integrations: TeamIntegrationStatus[];
  }>(`${API_BASE_URL}/teams/${teamSlug}/integrations`);
  return data.integrations;
}

export async function getTeamIntegrationStatus(
  teamSlug: string,
  provider: OAuthProvider,
): Promise<TeamIntegrationStatus> {
  const data = await workspaceRequest<{ status: TeamIntegrationStatus }>(
    `${API_BASE_URL}/teams/${teamSlug}/integrations/${provider}/status`,
  );
  return data.status;
}

export async function listTeamIntegrationBoards(
  teamSlug: string,
  provider: OAuthProvider,
): Promise<ExternalBoardOption[]> {
  const data = await workspaceRequest<{ boards: ExternalBoardOption[] }>(
    `${API_BASE_URL}/teams/${teamSlug}/integrations/${provider}/boards`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
  return data.boards;
}

export async function listTeamIntegrationSprints(
  teamSlug: string,
  provider: OAuthProvider,
  boardId: string,
): Promise<ExternalSprintOption[]> {
  const data = await workspaceRequest<{ sprints: ExternalSprintOption[] }>(
    `${API_BASE_URL}/teams/${teamSlug}/integrations/${provider}/sprints`,
    {
      method: "POST",
      body: JSON.stringify({ boardId }),
    },
  );
  return data.sprints;
}

export async function searchTeamIntegrationTickets(
  teamSlug: string,
  provider: OAuthProvider,
  payload: {
    boardId: string;
    sprintId?: string;
    sprintName?: string;
    sprintNumber?: number;
    query?: string;
    limit?: number;
  },
): Promise<ExternalTicketMetadata[]> {
  const data = await workspaceRequest<{ tickets: ExternalTicketMetadata[] }>(
    `${API_BASE_URL}/teams/${teamSlug}/integrations/${provider}/tickets`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return data.tickets;
}

export async function initiateTeamOAuth(
  teamSlug: string,
  provider: OAuthProvider,
): Promise<string> {
  const data = await workspaceRequest<{ authorizationUrl: string }>(
    `${API_BASE_URL}/teams/${teamSlug}/integrations/${provider}/authorize`,
    { method: "POST", body: JSON.stringify({}) },
  );
  return data.authorizationUrl;
}

export async function revokeTeamIntegration(
  teamSlug: string,
  provider: OAuthProvider,
): Promise<void> {
  await workspaceRequest(
    `${API_BASE_URL}/teams/${teamSlug}/integrations/${provider}`,
    { method: "DELETE" },
  );
}

export async function listTeamCollaborationInstallations(
  teamSlug: string,
): Promise<TeamCollaborationInstallation[]> {
  const data = await workspaceRequest<{
    installations: TeamCollaborationInstallation[];
  }>(`${API_BASE_URL}/teams/${teamSlug}/collaboration-installations`);
  return data.installations;
}

export async function saveTeamsCollaborationInstallation(
  teamSlug: string,
  payload: SaveTeamsCollaborationInstallationInput,
): Promise<TeamCollaborationInstallation> {
  const data = await workspaceRequest<{
    installation: TeamCollaborationInstallation;
  }>(`${API_BASE_URL}/teams/${teamSlug}/collaboration-installations/teams`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.installation;
}

export async function resolveTeamsCollaborationInstallation(
  payload: SaveTeamsCollaborationInstallationInput,
): Promise<TeamCollaborationInstallation | null> {
  const data = await workspaceRequest<{
    installation: TeamCollaborationInstallation | null;
  }>(`${API_BASE_URL}/collaboration-installations/teams/resolve`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.installation;
}

export async function deleteTeamCollaborationInstallation(
  teamSlug: string,
  installationId: number,
): Promise<void> {
  await workspaceRequest(
    `${API_BASE_URL}/teams/${teamSlug}/collaboration-installations/${installationId}`,
    { method: "DELETE" },
  );
}
