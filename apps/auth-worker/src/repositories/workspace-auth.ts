import { drizzle } from "drizzle-orm/d1";
import { eq, and, gt, desc, inArray } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import {
  allowedDomains,
  organisations,
  users,
  magicLinks,
  workspaceSessions,
  teams,
  teamSessions,
} from "@sprintjam/db";
import * as schema from "@sprintjam/db/d1/schemas";
import { extractDomain } from "@sprintjam/utils";

export class WorkspaceAuthRepository {
  private db: ReturnType<typeof drizzle>;

  constructor(d1: D1Database) {
    this.db = drizzle(d1, { schema });
  }

  async isDomainAllowed(domain: string): Promise<boolean> {
    const result = await this.db
      .select()
      .from(allowedDomains)
      .where(eq(allowedDomains.domain, domain.toLowerCase()))
      .get();

    return !!result;
  }

  async createMagicLink(
    email: string,
    tokenHash: string,
    expiresAt: number,
  ): Promise<void> {
    await this.db.insert(magicLinks).values({
      email: email.toLowerCase(),
      tokenHash,
      expiresAt,
      createdAt: Date.now(),
    });
  }

  async validateMagicLink(tokenHash: string): Promise<string | null> {
    const link = await this.db
      .select()
      .from(magicLinks)
      .where(
        and(
          eq(magicLinks.tokenHash, tokenHash),
          gt(magicLinks.expiresAt, Date.now()),
        ),
      )
      .get();

    if (!link || link.usedAt) {
      return null;
    }

    await this.db
      .update(magicLinks)
      .set({ usedAt: Date.now() })
      .where(eq(magicLinks.id, link.id));

    return link.email;
  }

  async getOrCreateOrganisation(domain: string): Promise<number> {
    await this.db
      .insert(organisations)
      .values({
        domain: domain.toLowerCase(),
        name: domain,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      .onConflictDoNothing();

    const result = await this.db
      .select()
      .from(organisations)
      .where(eq(organisations.domain, domain.toLowerCase()))
      .get();

    return result!.id;
  }

  async getOrCreateUser(
    email: string,
    organisationId: number,
  ): Promise<number> {
    const domain = extractDomain(email);

    await this.db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        emailDomain: domain,
        organisationId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastLoginAt: Date.now(),
      })
      .onConflictDoNothing();

    const existing = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .get();

    await this.db
      .update(users)
      .set({ lastLoginAt: Date.now(), updatedAt: Date.now() })
      .where(eq(users.id, existing!.id));

    return existing!.id;
  }

  async createSession(
    userId: number,
    tokenHash: string,
    expiresAt: number,
  ): Promise<void> {
    await this.db.insert(workspaceSessions).values({
      userId,
      tokenHash,
      expiresAt,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    });
  }

  async validateSession(
    tokenHash: string,
  ): Promise<{ userId: number; email: string } | null> {
    const session = await this.db
      .select({
        userId: workspaceSessions.userId,
        expiresAt: workspaceSessions.expiresAt,
        email: users.email,
      })
      .from(workspaceSessions)
      .innerJoin(users, eq(users.id, workspaceSessions.userId))
      .where(eq(workspaceSessions.tokenHash, tokenHash))
      .get();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    await this.db
      .update(workspaceSessions)
      .set({ lastUsedAt: Date.now() })
      .where(eq(workspaceSessions.tokenHash, tokenHash));

    return {
      userId: session.userId,
      email: session.email,
    };
  }

  async invalidateSession(tokenHash: string): Promise<void> {
    await this.db
      .delete(workspaceSessions)
      .where(eq(workspaceSessions.tokenHash, tokenHash));
  }

  async getUserByEmail(email: string) {
    return await this.db
      .select({
        id: users.id,
        email: users.email,
        emailDomain: users.emailDomain,
        organisationId: users.organisationId,
        name: users.name,
      })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .get();
  }

  async getUserTeams(userId: number) {
    return await this.db
      .select({
        id: teams.id,
        name: teams.name,
        organisationId: teams.organisationId,
        ownerId: teams.ownerId,
        createdAt: teams.createdAt,
      })
      .from(teams)
      .where(eq(teams.ownerId, userId));
  }

  async createTeam(
    organisationId: number,
    name: string,
    ownerId: number,
  ): Promise<number> {
    const result = await this.db
      .insert(teams)
      .values({
        organisationId,
        name,
        ownerId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      .returning({ id: teams.id });

    return result[0].id;
  }

  async getTeamById(teamId: number) {
    return await this.db
      .select({
        id: teams.id,
        name: teams.name,
        organisationId: teams.organisationId,
        ownerId: teams.ownerId,
        createdAt: teams.createdAt,
        updatedAt: teams.updatedAt,
      })
      .from(teams)
      .where(eq(teams.id, teamId))
      .get();
  }

  async updateTeam(teamId: number, updates: { name?: string }): Promise<void> {
    await this.db
      .update(teams)
      .set({
        ...updates,
        updatedAt: Date.now(),
      })
      .where(eq(teams.id, teamId));
  }

  async deleteTeam(teamId: number): Promise<void> {
    await this.db.delete(teamSessions).where(eq(teamSessions.teamId, teamId));

    await this.db.delete(teams).where(eq(teams.id, teamId));
  }

  async isTeamOwner(teamId: number, userId: number): Promise<boolean> {
    const team = await this.db
      .select({ ownerId: teams.ownerId })
      .from(teams)
      .where(eq(teams.id, teamId))
      .get();
    return team?.ownerId === userId;
  }

  async isUserInOrganisation(
    userId: number,
    organisationId: number,
  ): Promise<boolean> {
    const user = await this.db
      .select({ organisationId: users.organisationId })
      .from(users)
      .where(eq(users.id, userId))
      .get();
    return user?.organisationId === organisationId;
  }

  async createTeamSession(
    teamId: number,
    roomKey: string,
    name: string,
    createdById: number,
    metadata?: Record<string, unknown>,
  ): Promise<number> {
    const result = await this.db
      .insert(teamSessions)
      .values({
        teamId,
        roomKey,
        name,
        createdById,
        createdAt: Date.now(),
        metadata: metadata ? JSON.stringify(metadata) : null,
      })
      .returning({ id: teamSessions.id });

    return result[0].id;
  }

  async getTeamSessions(teamId: number) {
    return await this.db
      .select({
        id: teamSessions.id,
        teamId: teamSessions.teamId,
        roomKey: teamSessions.roomKey,
        name: teamSessions.name,
        createdById: teamSessions.createdById,
        createdAt: teamSessions.createdAt,
        completedAt: teamSessions.completedAt,
        metadata: teamSessions.metadata,
      })
      .from(teamSessions)
      .where(eq(teamSessions.teamId, teamId))
      .orderBy(desc(teamSessions.createdAt));
  }

  async getTeamSessionById(sessionId: number) {
    return await this.db
      .select({
        id: teamSessions.id,
        teamId: teamSessions.teamId,
        roomKey: teamSessions.roomKey,
        name: teamSessions.name,
        createdById: teamSessions.createdById,
        createdAt: teamSessions.createdAt,
        completedAt: teamSessions.completedAt,
        metadata: teamSessions.metadata,
      })
      .from(teamSessions)
      .where(eq(teamSessions.id, sessionId))
      .get();
  }

  async completeTeamSession(sessionId: number): Promise<void> {
    await this.db
      .update(teamSessions)
      .set({ completedAt: Date.now() })
      .where(eq(teamSessions.id, sessionId));
  }

  async getWorkspaceStats(userId: number) {
    const userTeams = await this.getUserTeams(userId);

    if (userTeams.length === 0) {
      return {
        totalTeams: 0,
        totalSessions: 0,
        activeSessions: 0,
        completedSessions: 0,
      };
    }

    const teamIds = userTeams.map((t) => t.id);

    const sessions = await this.db
      .select({
        id: teamSessions.id,
        completedAt: teamSessions.completedAt,
      })
      .from(teamSessions)
      .where(inArray(teamSessions.teamId, teamIds));

    const totalSessions = sessions.length;
    const activeSessions = sessions.filter((s) => !s.completedAt).length;
    const completedSessions = sessions.filter((s) => !!s.completedAt).length;

    return {
      totalTeams: userTeams.length,
      totalSessions,
      activeSessions,
      completedSessions,
    };
  }

  async getUserById(userId: number) {
    return await this.db
      .select({
        id: users.id,
        email: users.email,
        emailDomain: users.emailDomain,
        organisationId: users.organisationId,
        name: users.name,
      })
      .from(users)
      .where(eq(users.id, userId))
      .get();
  }

  async updateUserName(userId: number, name: string): Promise<void> {
    await this.db
      .update(users)
      .set({ name, updatedAt: Date.now() })
      .where(eq(users.id, userId));
  }

  async cleanupExpiredMagicLinks(): Promise<number> {
    const expiredLinks = await this.db
      .select({ id: magicLinks.id })
      .from(magicLinks)
      .where(gt(Date.now(), magicLinks.expiresAt))
      .all();

    if (expiredLinks.length === 0) {
      return 0;
    }

    const ids = expiredLinks.map((link) => link.id);
    await this.db.delete(magicLinks).where(inArray(magicLinks.id, ids));

    return expiredLinks.length;
  }

  async cleanupExpiredSessions(): Promise<number> {
    const expiredSessions = await this.db
      .select({ tokenHash: workspaceSessions.tokenHash })
      .from(workspaceSessions)
      .where(gt(Date.now(), workspaceSessions.expiresAt))
      .all();

    if (expiredSessions.length === 0) {
      return 0;
    }

    const tokenHashes = expiredSessions.map((s) => s.tokenHash);
    await this.db
      .delete(workspaceSessions)
      .where(inArray(workspaceSessions.tokenHash, tokenHashes));

    return expiredSessions.length;
  }
}
