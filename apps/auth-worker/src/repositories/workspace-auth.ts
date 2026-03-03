import type { D1Database } from "@cloudflare/workers-types";

import { AuthRepository } from "./auth-repository";
import { TeamRepository } from "./team-repository";

export class WorkspaceAuthRepository {
  private auth: AuthRepository;
  private teams: TeamRepository;

  constructor(d1: D1Database) {
    this.auth = new AuthRepository(d1);
    this.teams = new TeamRepository(d1);
  }

  isDomainAllowed(domain: string): Promise<boolean> {
    return this.auth.isDomainAllowed(domain);
  }

  createMagicLink(
    email: string,
    tokenHash: string,
    expiresAt: number,
  ): Promise<void> {
    return this.auth.createMagicLink(email, tokenHash, expiresAt);
  }

  validateVerificationCode(
    email: string,
    codeHash: string,
  ): Promise<
    | { success: true; email: string }
    | { success: false; error: "invalid" | "expired" | "used" | "locked" }
  > {
    return this.auth.validateVerificationCode(email, codeHash);
  }

  getOrCreateOrganisation(domain: string): Promise<number> {
    return this.auth.getOrCreateOrganisation(domain);
  }

  getOrCreateUser(email: string, organisationId: number): Promise<number> {
    return this.auth.getOrCreateUser(email, organisationId);
  }

  createSession(
    userId: number,
    tokenHash: string,
    expiresAt: number,
  ): Promise<void> {
    return this.auth.createSession(userId, tokenHash, expiresAt);
  }

  validateSession(tokenHash: string): Promise<{
    userId: number;
    email: string;
    organisationId: number;
    workspaceRole: "admin" | "member";
  } | null> {
    return this.auth.validateSession(tokenHash);
  }

  invalidateSession(tokenHash: string): Promise<void> {
    return this.auth.invalidateSession(tokenHash);
  }

  invalidateSessionsForUser(userId: number): Promise<void> {
    return this.auth.invalidateSessionsForUser(userId);
  }

  getUserByEmail(email: string) {
    return this.auth.getUserByEmail(email);
  }

  getUserById(userId: number) {
    return this.auth.getUserById(userId);
  }

  updateUserProfile(
    userId: number,
    updates: {
      name?: string | null;
      avatar?: string | null;
    },
  ): Promise<void> {
    return this.auth.updateUserProfile(userId, updates);
  }

  getOrganisationById(organisationId: number) {
    return this.auth.getOrganisationById(organisationId);
  }

  updateOrganisation(
    organisationId: number,
    updates: {
      name?: string;
      logoUrl?: string | null;
      requireMemberApproval?: boolean;
    },
  ): Promise<void> {
    return this.auth.updateOrganisation(organisationId, updates);
  }

  getOrganisationMemberById(organisationId: number, userId: number) {
    return this.auth.getOrganisationMemberById(organisationId, userId);
  }

  getOrganisationMembers(
    organisationId: number,
    statusFilter?: "active" | "pending",
  ) {
    return this.auth.getOrganisationMembers(organisationId, statusFilter);
  }

  getOrganisationMembership(userId: number, organisationId: number) {
    return this.auth.getOrganisationMembership(userId, organisationId);
  }

  getActiveOrganisationMembershipByEmail(email: string) {
    return this.auth.getActiveOrganisationMembershipByEmail(email);
  }

  upsertWorkspaceMembership(params: {
    organisationId: number;
    userId: number;
    role: "admin" | "member";
    status: "pending" | "active";
    approvedById?: number | null;
  }): Promise<void> {
    return this.auth.upsertWorkspaceMembership(params);
  }

  approveWorkspaceMembership(
    organisationId: number,
    userId: number,
    approvedById: number,
  ): Promise<void> {
    return this.auth.approveWorkspaceMembership(
      organisationId,
      userId,
      approvedById,
    );
  }

  updateWorkspaceMembershipRole(
    userId: number,
    organisationId: number,
    role: "admin" | "member",
  ): Promise<boolean> {
    return this.auth.updateWorkspaceMembershipRole(
      userId,
      organisationId,
      role,
    );
  }

  removeWorkspaceMembership(
    organisationId: number,
    userId: number,
  ): Promise<void> {
    return this.auth.removeWorkspaceMembership(organisationId, userId);
  }

  isOrganisationAdmin(userId: number, organisationId: number) {
    return this.auth.isOrganisationAdmin(userId, organisationId);
  }

  setOrganisationOwnerIfNull(
    organisationId: number,
    userId: number,
  ): Promise<void> {
    return this.auth.setOrganisationOwnerIfNull(organisationId, userId);
  }

  updateUserOrganisation(
    userId: number,
    organisationId: number,
  ): Promise<void> {
    return this.auth.updateUserOrganisation(userId, organisationId);
  }

  createOrUpdateWorkspaceInvite(
    organisationId: number,
    email: string,
    invitedById: number,
  ) {
    return this.auth.createOrUpdateWorkspaceInvite(
      organisationId,
      email,
      invitedById,
    );
  }

  listPendingWorkspaceInvites(organisationId: number) {
    return this.auth.listPendingWorkspaceInvites(organisationId);
  }

  getPendingWorkspaceInviteByEmail(email: string) {
    return this.auth.getPendingWorkspaceInviteByEmail(email);
  }

  markWorkspaceInviteAccepted(
    inviteId: number,
    acceptedById: number,
  ): Promise<void> {
    return this.auth.markWorkspaceInviteAccepted(inviteId, acceptedById);
  }

  logAuditEvent(params: {
    userId?: number | null;
    email?: string | null;
    event: string;
    status: "success" | "failure";
    reason?: string | null;
    ip?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    return this.auth.logAuditEvent(params);
  }

  createAuthChallenge(params: {
    userId: number;
    tokenHash: string;
    type: "setup" | "verify" | "oauth";
    method?: string | null;
    metadata?: string | null;
    expiresAt: number;
  }): Promise<number> {
    return this.auth.createAuthChallenge(params);
  }

  getAuthChallengeByTokenHash(tokenHash: string) {
    return this.auth.getAuthChallengeByTokenHash(tokenHash);
  }

  markAuthChallengeUsed(id: number): Promise<void> {
    return this.auth.markAuthChallengeUsed(id);
  }

  updateAuthChallengeMetadata(
    id: number,
    metadata: string,
    method?: string | null,
  ): Promise<void> {
    return this.auth.updateAuthChallengeMetadata(id, metadata, method);
  }

  listMfaCredentials(userId: number) {
    return this.auth.listMfaCredentials(userId);
  }

  getTotpCredential(userId: number) {
    return this.auth.getTotpCredential(userId);
  }

  listWebAuthnCredentials(userId: number) {
    return this.auth.listWebAuthnCredentials(userId);
  }

  getWebAuthnCredentialById(credentialId: string) {
    return this.auth.getWebAuthnCredentialById(credentialId);
  }

  createTotpCredential(userId: number, secretEncrypted: string): Promise<void> {
    return this.auth.createTotpCredential(userId, secretEncrypted);
  }

  createWebAuthnCredential(params: {
    userId: number;
    credentialId: string;
    publicKey: string;
    counter: number;
  }): Promise<void> {
    return this.auth.createWebAuthnCredential(params);
  }

  updateWebAuthnCounter(id: number, counter: number): Promise<void> {
    return this.auth.updateWebAuthnCounter(id, counter);
  }

  storeRecoveryCodes(userId: number, codeHashes: string[]): Promise<void> {
    return this.auth.storeRecoveryCodes(userId, codeHashes);
  }

  consumeRecoveryCode(userId: number, codeHash: string): Promise<boolean> {
    return this.auth.consumeRecoveryCode(userId, codeHash);
  }

  resetMfaConfiguration(userId: number): Promise<void> {
    return this.auth.resetMfaConfiguration(userId);
  }

  getOrganisationTeams(organisationId: number) {
    return this.teams.getOrganisationTeams(organisationId);
  }

  getUserTeams(
    userId: number,
    organisationId: number,
    isWorkspaceAdmin: boolean,
  ) {
    return this.teams.getUserTeams(userId, organisationId, isWorkspaceAdmin);
  }

  createTeam(
    organisationId: number,
    name: string,
    ownerId: number,
    accessPolicy?: "open" | "restricted",
  ): Promise<number> {
    return this.teams.createTeam(organisationId, name, ownerId, accessPolicy);
  }

  getTeamById(teamId: number) {
    return this.teams.getTeamById(teamId);
  }

  updateTeam(
    teamId: number,
    updates: { name?: string; accessPolicy?: "open" | "restricted" },
  ): Promise<void> {
    return this.teams.updateTeam(teamId, updates);
  }

  deleteTeam(teamId: number): Promise<void> {
    return this.teams.deleteTeam(teamId);
  }

  getTeamMembership(teamId: number, userId: number) {
    return this.teams.getTeamMembership(teamId, userId);
  }

  getTeamMemberById(teamId: number, userId: number) {
    return this.teams.getTeamMemberById(teamId, userId);
  }

  getTeamMembershipsForUser(userId: number, teamIds: number[]) {
    return this.teams.getTeamMembershipsForUser(userId, teamIds);
  }

  listTeamMembers(teamId: number) {
    return this.teams.listTeamMembers(teamId);
  }

  upsertTeamMembership(params: {
    teamId: number;
    userId: number;
    role: "admin" | "member";
    status: "pending" | "active";
    approvedById?: number | null;
  }): Promise<void> {
    return this.teams.upsertTeamMembership(params);
  }

  approveTeamMembership(
    teamId: number,
    userId: number,
    approvedById: number,
  ): Promise<void> {
    return this.teams.approveTeamMembership(teamId, userId, approvedById);
  }

  updateTeamMembershipRole(
    teamId: number,
    userId: number,
    role: "admin" | "member",
  ): Promise<boolean> {
    return this.teams.updateTeamMembershipRole(teamId, userId, role);
  }

  removeTeamMembership(teamId: number, userId: number): Promise<void> {
    return this.teams.removeTeamMembership(teamId, userId);
  }

  removeUserFromTeams(userId: number): Promise<void> {
    return this.teams.removeUserFromTeams(userId);
  }

  isTeamAdmin(teamId: number, userId: number): Promise<boolean> {
    return this.teams.isTeamAdmin(teamId, userId);
  }

  isTeamMember(teamId: number, userId: number): Promise<boolean> {
    return this.teams.isTeamMember(teamId, userId);
  }

  createTeamSession(
    teamId: number,
    roomKey: string,
    name: string,
    createdById: number,
    metadata?: Record<string, unknown>,
  ): Promise<number> {
    return this.teams.createTeamSession(
      teamId,
      roomKey,
      name,
      createdById,
      metadata,
    );
  }

  getTeamSessions(teamId: number) {
    return this.teams.getTeamSessions(teamId);
  }

  getOrganisationTeamSessionByRoomKey(roomKey: string, organisationId: number) {
    return this.teams.getOrganisationTeamSessionByRoomKey(
      roomKey,
      organisationId,
    );
  }

  getAccessibleTeamSessionByRoomKey(
    roomKey: string,
    organisationId: number,
    userId: number,
    isWorkspaceAdmin: boolean,
  ) {
    return this.teams.getAccessibleTeamSessionByRoomKey(
      roomKey,
      organisationId,
      userId,
      isWorkspaceAdmin,
    );
  }

  getTeamSessionById(sessionId: number) {
    return this.teams.getTeamSessionById(sessionId);
  }

  updateTeamSessionName(sessionId: number, name: string): Promise<void> {
    return this.teams.updateTeamSessionName(sessionId, name);
  }

  completeTeamSession(sessionId: number): Promise<void> {
    return this.teams.completeTeamSession(sessionId);
  }

  completeLatestSessionByRoomKey(
    roomKey: string,
    organisationId: number,
    userId: number,
    isWorkspaceAdmin: boolean,
  ) {
    return this.teams.completeLatestSessionByRoomKey(
      roomKey,
      organisationId,
      userId,
      isWorkspaceAdmin,
    );
  }

  getWorkspaceStats(
    organisationId: number,
    userId: number,
    isWorkspaceAdmin: boolean,
  ) {
    return this.teams.getWorkspaceStats(
      organisationId,
      userId,
      isWorkspaceAdmin,
    );
  }

  getTeamSettings(teamId: number) {
    return this.teams.getTeamSettings(teamId);
  }

  saveTeamSettings(
    teamId: number,
    settings: import("@sprintjam/types").RoomSettings,
  ): Promise<void> {
    return this.teams.saveTeamSettings(teamId, settings);
  }

  cleanupExpiredMagicLinks(): Promise<number> {
    return this.auth.cleanupExpiredMagicLinks();
  }

  cleanupExpiredSessions(): Promise<number> {
    return this.auth.cleanupExpiredSessions();
  }
}
