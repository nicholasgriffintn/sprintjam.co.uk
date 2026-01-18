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

  validateSession(
    tokenHash: string,
  ): Promise<{ userId: number; email: string } | null> {
    return this.auth.validateSession(tokenHash);
  }

  invalidateSession(tokenHash: string): Promise<void> {
    return this.auth.invalidateSession(tokenHash);
  }

  getUserByEmail(email: string) {
    return this.auth.getUserByEmail(email);
  }

  getUserById(userId: number) {
    return this.auth.getUserById(userId);
  }

  getUserTeams(userId: number) {
    return this.teams.getUserTeams(userId);
  }

  createTeam(
    organisationId: number,
    name: string,
    ownerId: number,
  ): Promise<number> {
    return this.teams.createTeam(organisationId, name, ownerId);
  }

  getTeamById(teamId: number) {
    return this.teams.getTeamById(teamId);
  }

  updateTeam(teamId: number, updates: { name?: string }): Promise<void> {
    return this.teams.updateTeam(teamId, updates);
  }

  deleteTeam(teamId: number): Promise<void> {
    return this.teams.deleteTeam(teamId);
  }

  isTeamOwner(teamId: number, userId: number): Promise<boolean> {
    return this.teams.isTeamOwner(teamId, userId);
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

  getTeamSessionById(sessionId: number) {
    return this.teams.getTeamSessionById(sessionId);
  }

  completeTeamSession(sessionId: number): Promise<void> {
    return this.teams.completeTeamSession(sessionId);
  }

  completeLatestSessionByRoomKey(roomKey: string, userId: number) {
    return this.teams.completeLatestSessionByRoomKey(roomKey, userId);
  }

  getWorkspaceStats(userId: number) {
    return this.teams.getWorkspaceStats(userId);
  }

  cleanupExpiredMagicLinks(): Promise<number> {
    return this.auth.cleanupExpiredMagicLinks();
  }

  cleanupExpiredSessions(): Promise<number> {
    return this.auth.cleanupExpiredSessions();
  }
}
