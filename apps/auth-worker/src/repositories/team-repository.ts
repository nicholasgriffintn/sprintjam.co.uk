import { drizzle } from "drizzle-orm/d1";
import { eq, inArray, sql, desc } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import { teams, teamSessions, users } from "@sprintjam/db";
import * as schema from "@sprintjam/db/d1/schemas";

const MAX_SESSIONS_FOR_STATS = 5000;

export class TeamRepository {
  private db: ReturnType<typeof drizzle>;

  constructor(d1: D1Database) {
    this.db = drizzle(d1, { schema });
  }

  async getUserTeams(userId: number) {
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
      .orderBy(schema.teamSessions.createdAt);
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

  async completeLatestSessionByRoomKey(roomKey: string, userId: number) {
    const user = await this.db
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

    if (!user) {
      return null;
    }

    const session = await this.db
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
      .innerJoin(teams, eq(teamSessions.teamId, teams.id))
      .where(
        sql`${teamSessions.roomKey} = ${roomKey} AND ${teams.organisationId} = ${user.organisationId} AND ${teams.ownerId} = ${userId} AND ${teamSessions.completedAt} IS NULL`,
      )
      .orderBy(desc(teamSessions.createdAt))
      .limit(1)
      .get();

    if (!session) {
      return null;
    }

    await this.completeTeamSession(session.id);
    return await this.getTeamSessionById(session.id);
  }

  async getWorkspaceStats(userId: number) {
    const userTeams = await this.getUserTeams(userId);

    if (userTeams.length === 0) {
      return {
        totalTeams: 0,
        totalSessions: 0,
        activeSessions: 0,
        completedSessions: 0,
        sessionTimeline: [],
      };
    }

    const teamIds = userTeams.map((t) => t.id);

    const sessions = await this.db
      .select({
        id: teamSessions.id,
        createdAt: teamSessions.createdAt,
        completedAt: teamSessions.completedAt,
      })
      .from(teamSessions)
      .where(inArray(teamSessions.teamId, teamIds))
      .orderBy(desc(teamSessions.createdAt))
      .limit(MAX_SESSIONS_FOR_STATS);

    const totalSessions = sessions.length;
    const activeSessions = sessions.filter((s) => !s.completedAt).length;
    const completedSessions = sessions.filter((s) => !!s.completedAt).length;

    const sessionTimeline = this.buildSessionTimeline(sessions);

    return {
      totalTeams: userTeams.length,
      totalSessions,
      activeSessions,
      completedSessions,
      sessionTimeline,
    };
  }

  private buildSessionTimeline(
    sessions: Array<{ createdAt: number; completedAt: number | null }>,
  ) {
    const now = Date.now();
    const sixMonthsAgo = now - 6 * 30 * 24 * 60 * 60 * 1000;

    const monthCounts = new Map<string, number>();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(1);
      date.setMonth(date.getMonth() - i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthCounts.set(key, 0);
    }

    for (const session of sessions) {
      if (session.createdAt >= sixMonthsAgo) {
        const date = new Date(session.createdAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (monthCounts.has(key)) {
          monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
        }
      }
    }

    return Array.from(monthCounts.entries()).map(([period, count]) => {
      const [year, month] = period.split("-");
      const date = new Date(
        Number.parseInt(year, 10),
        Number.parseInt(month, 10) - 1,
      );
      return {
        period: date.toLocaleString("default", { month: "short" }),
        yearMonth: period,
        count,
      };
    });
  }
}
