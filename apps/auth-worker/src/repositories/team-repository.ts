import { drizzle } from "drizzle-orm/d1";
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import {
  teamMemberships,
  teamSessions,
  teamSettings,
  teams,
  users,
} from "@sprintjam/db";
import * as schema from "@sprintjam/db/d1/schemas";
import type { RoomSettings } from "@sprintjam/types";

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

const teamSelection = {
  id: teams.id,
  name: teams.name,
  organisationId: teams.organisationId,
  ownerId: teams.ownerId,
  accessPolicy: teams.accessPolicy,
  createdAt: teams.createdAt,
  updatedAt: teams.updatedAt,
};

const teamSessionSelection = {
  id: teamSessions.id,
  teamId: teamSessions.teamId,
  roomKey: teamSessions.roomKey,
  name: teamSessions.name,
  createdById: teamSessions.createdById,
  createdAt: teamSessions.createdAt,
  completedAt: teamSessions.completedAt,
  metadata: teamSessions.metadata,
};

export class TeamRepository {
  private db: ReturnType<typeof drizzle>;

  constructor(d1: D1Database) {
    this.db = drizzle(d1, { schema });
  }

  async getOrganisationTeams(organisationId: number) {
    return await this.db
      .select(teamSelection)
      .from(teams)
      .where(eq(teams.organisationId, organisationId))
      .orderBy(teams.name);
  }

  async getUserTeams(
    userId: number,
    organisationId: number,
    isWorkspaceAdmin: boolean,
  ) {
    if (isWorkspaceAdmin) {
      return this.getOrganisationTeams(organisationId);
    }

    return await this.db
      .select(teamSelection)
      .from(teams)
      .leftJoin(
        teamMemberships,
        and(
          eq(teamMemberships.teamId, teams.id),
          eq(teamMemberships.userId, userId),
          eq(teamMemberships.status, "active"),
        ),
      )
      .where(
        and(
          eq(teams.organisationId, organisationId),
          or(
            eq(teams.accessPolicy, "open"),
            eq(teamMemberships.userId, userId),
          ),
        ),
      )
      .orderBy(teams.name);
  }

  async createTeam(
    organisationId: number,
    name: string,
    ownerId: number,
    accessPolicy: "open" | "restricted" = "open",
  ): Promise<number> {
    const now = Date.now();
    const result = await this.db
      .insert(teams)
      .values({
        organisationId,
        name,
        ownerId,
        accessPolicy,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: teams.id });

    const teamId = result[0].id;

    await this.upsertTeamMembership({
      teamId,
      userId: ownerId,
      role: "admin",
      status: "active",
      approvedById: ownerId,
    });

    return teamId;
  }

  async getTeamById(teamId: number) {
    return await this.db
      .select(teamSelection)
      .from(teams)
      .where(eq(teams.id, teamId))
      .get();
  }

  async updateTeam(
    teamId: number,
    updates: { name?: string; accessPolicy?: "open" | "restricted" },
  ): Promise<void> {
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
    await this.db
      .delete(teamMemberships)
      .where(eq(teamMemberships.teamId, teamId));
    await this.db.delete(teams).where(eq(teams.id, teamId));
  }

  async getTeamMembership(teamId: number, userId: number) {
    return await this.db
      .select({
        id: teamMemberships.id,
        teamId: teamMemberships.teamId,
        userId: teamMemberships.userId,
        role: teamMemberships.role,
        status: teamMemberships.status,
        approvedById: teamMemberships.approvedById,
        approvedAt: teamMemberships.approvedAt,
        createdAt: teamMemberships.createdAt,
        updatedAt: teamMemberships.updatedAt,
      })
      .from(teamMemberships)
      .where(
        and(
          eq(teamMemberships.teamId, teamId),
          eq(teamMemberships.userId, userId),
        ),
      )
      .get();
  }

  async getTeamMemberById(teamId: number, userId: number) {
    return await this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatar: users.avatar,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        role: teamMemberships.role,
        status: teamMemberships.status,
        approvedAt: teamMemberships.approvedAt,
      })
      .from(teamMemberships)
      .innerJoin(users, eq(users.id, teamMemberships.userId))
      .where(
        and(
          eq(teamMemberships.teamId, teamId),
          eq(teamMemberships.userId, userId),
        ),
      )
      .get();
  }

  async getTeamMembershipsForUser(userId: number, teamIds: number[]) {
    if (teamIds.length === 0) return [];
    return await this.db
      .select({
        teamId: teamMemberships.teamId,
        role: teamMemberships.role,
        status: teamMemberships.status,
      })
      .from(teamMemberships)
      .where(
        and(
          eq(teamMemberships.userId, userId),
          inArray(teamMemberships.teamId, teamIds),
        ),
      );
  }

  async listTeamMembers(teamId: number) {
    return await this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatar: users.avatar,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        role: teamMemberships.role,
        status: teamMemberships.status,
        approvedAt: teamMemberships.approvedAt,
      })
      .from(teamMemberships)
      .innerJoin(users, eq(users.id, teamMemberships.userId))
      .where(eq(teamMemberships.teamId, teamId))
      .orderBy(users.email);
  }

  async upsertTeamMembership(params: {
    teamId: number;
    userId: number;
    role: "admin" | "member";
    status: "pending" | "active";
    approvedById?: number | null;
  }): Promise<void> {
    const now = Date.now();
    const approvedAt = params.status === "active" ? now : null;

    await this.db
      .insert(teamMemberships)
      .values({
        teamId: params.teamId,
        userId: params.userId,
        role: params.role,
        status: params.status,
        approvedById:
          params.status === "active" ? (params.approvedById ?? null) : null,
        approvedAt,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [teamMemberships.teamId, teamMemberships.userId],
        set: {
          role: params.role,
          status: params.status,
          approvedById:
            params.status === "active" ? (params.approvedById ?? null) : null,
          approvedAt,
          updatedAt: now,
        },
      });
  }

  async approveTeamMembership(
    teamId: number,
    userId: number,
    approvedById: number,
  ): Promise<void> {
    await this.db
      .update(teamMemberships)
      .set({
        status: "active",
        approvedById,
        approvedAt: Date.now(),
        updatedAt: Date.now(),
      })
      .where(
        and(
          eq(teamMemberships.teamId, teamId),
          eq(teamMemberships.userId, userId),
        ),
      );
  }

  async updateTeamMembershipRole(
    teamId: number,
    userId: number,
    role: "admin" | "member",
  ): Promise<boolean> {
    const result = await this.db
      .update(teamMemberships)
      .set({
        role,
        updatedAt: Date.now(),
      })
      .where(
        and(
          eq(teamMemberships.teamId, teamId),
          eq(teamMemberships.userId, userId),
          eq(teamMemberships.status, "active"),
        ),
      )
      .returning({ id: teamMemberships.id });

    return result.length > 0;
  }

  async removeTeamMembership(teamId: number, userId: number): Promise<void> {
    await this.db
      .delete(teamMemberships)
      .where(
        and(
          eq(teamMemberships.teamId, teamId),
          eq(teamMemberships.userId, userId),
        ),
      );
  }

  async removeUserFromTeams(userId: number): Promise<void> {
    await this.db
      .delete(teamMemberships)
      .where(eq(teamMemberships.userId, userId));
  }

  async isTeamAdmin(teamId: number, userId: number): Promise<boolean> {
    const membership = await this.db
      .select({ role: teamMemberships.role })
      .from(teamMemberships)
      .where(
        and(
          eq(teamMemberships.teamId, teamId),
          eq(teamMemberships.userId, userId),
          eq(teamMemberships.status, "active"),
        ),
      )
      .get();

    if (membership?.role === "admin") {
      return true;
    }

    const team = await this.db
      .select({ ownerId: teams.ownerId })
      .from(teams)
      .where(eq(teams.id, teamId))
      .get();

    return team?.ownerId === userId;
  }

  async isTeamMember(teamId: number, userId: number): Promise<boolean> {
    const membership = await this.db
      .select({ id: teamMemberships.id })
      .from(teamMemberships)
      .where(
        and(
          eq(teamMemberships.teamId, teamId),
          eq(teamMemberships.userId, userId),
          eq(teamMemberships.status, "active"),
        ),
      )
      .get();

    if (membership?.id) {
      return true;
    }

    const team = await this.db
      .select({ ownerId: teams.ownerId })
      .from(teams)
      .where(eq(teams.id, teamId))
      .get();

    return team?.ownerId === userId;
  }

  async getTeamSettings(teamId: number): Promise<RoomSettings | null> {
    const row = await this.db
      .select({ settings: teamSettings.settings })
      .from(teamSettings)
      .where(eq(teamSettings.teamId, teamId))
      .get();

    if (!row) return null;

    try {
      return JSON.parse(row.settings) as RoomSettings;
    } catch {
      return null;
    }
  }

  async saveTeamSettings(
    teamId: number,
    settings: RoomSettings,
  ): Promise<void> {
    const now = Date.now();
    await this.db
      .insert(teamSettings)
      .values({
        teamId,
        settings: JSON.stringify(settings),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: teamSettings.teamId,
        set: {
          settings: JSON.stringify(settings),
          updatedAt: now,
        },
      });
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
      .select(teamSessionSelection)
      .from(teamSessions)
      .where(eq(teamSessions.teamId, teamId))
      .orderBy(schema.teamSessions.createdAt);
  }

  async getOrganisationTeamSessionByRoomKey(
    roomKey: string,
    organisationId: number,
  ) {
    return await this.db
      .select(teamSessionSelection)
      .from(teamSessions)
      .innerJoin(teams, eq(teamSessions.teamId, teams.id))
      .where(
        and(
          eq(teamSessions.roomKey, roomKey),
          eq(teams.organisationId, organisationId),
        ),
      )
      .orderBy(desc(teamSessions.createdAt))
      .limit(1)
      .get();
  }

  async getAccessibleTeamSessionByRoomKey(
    roomKey: string,
    organisationId: number,
    userId: number,
    isWorkspaceAdmin: boolean,
  ) {
    return await this.db
      .select(teamSessionSelection)
      .from(teamSessions)
      .innerJoin(teams, eq(teamSessions.teamId, teams.id))
      .leftJoin(
        teamMemberships,
        and(
          eq(teamMemberships.teamId, teams.id),
          eq(teamMemberships.userId, userId),
          eq(teamMemberships.status, "active"),
        ),
      )
      .where(
        and(
          eq(teamSessions.roomKey, roomKey),
          eq(teams.organisationId, organisationId),
          isWorkspaceAdmin
            ? sql`1 = 1`
            : or(
                eq(teamSessions.createdById, userId),
                eq(teams.accessPolicy, "open"),
                eq(teamMemberships.userId, userId),
              ),
        ),
      )
      .orderBy(desc(teamSessions.createdAt))
      .limit(1)
      .get();
  }

  async getTeamSessionById(sessionId: number) {
    return await this.db
      .select(teamSessionSelection)
      .from(teamSessions)
      .where(eq(teamSessions.id, sessionId))
      .get();
  }

  async updateTeamSessionName(sessionId: number, name: string): Promise<void> {
    await this.db
      .update(teamSessions)
      .set({ name })
      .where(eq(teamSessions.id, sessionId));
  }

  async completeTeamSession(sessionId: number): Promise<void> {
    await this.db
      .update(teamSessions)
      .set({ completedAt: Date.now() })
      .where(eq(teamSessions.id, sessionId));
  }

  async completeLatestSessionByRoomKey(
    roomKey: string,
    organisationId: number,
    userId: number,
    isWorkspaceAdmin: boolean,
  ) {
    const session = await this.getAccessibleTeamSessionByRoomKey(
      roomKey,
      organisationId,
      userId,
      isWorkspaceAdmin,
    );

    if (!session || session.completedAt) {
      return null;
    }

    const completedAt = Date.now();
    const activeSessions = await this.db
      .select({ id: teamSessions.id })
      .from(teamSessions)
      .innerJoin(teams, eq(teamSessions.teamId, teams.id))
      .leftJoin(
        teamMemberships,
        and(
          eq(teamMemberships.teamId, teams.id),
          eq(teamMemberships.userId, userId),
          eq(teamMemberships.status, "active"),
        ),
      )
      .where(
        and(
          eq(teamSessions.roomKey, roomKey),
          eq(teams.organisationId, organisationId),
          isWorkspaceAdmin
            ? sql`1 = 1`
            : or(
                eq(teamSessions.createdById, userId),
                eq(teams.accessPolicy, "open"),
                eq(teamMemberships.userId, userId),
              ),
          isNull(teamSessions.completedAt),
        ),
      );

    if (activeSessions.length === 0) {
      return null;
    }

    await this.db
      .update(teamSessions)
      .set({ completedAt })
      .where(inArray(teamSessions.id, activeSessions.map((item) => item.id)));

    return await this.getTeamSessionById(session.id);
  }

  async getWorkspaceStats(
    organisationId: number,
    userId: number,
    isWorkspaceAdmin: boolean,
  ) {
    const userTeams = await this.getUserTeams(
      userId,
      organisationId,
      isWorkspaceAdmin,
    );

    if (userTeams.length === 0) {
      return {
        totalTeams: 0,
        totalSessions: 0,
        activeSessions: 0,
        completedSessions: 0,
        sessionTimeline: [],
      };
    }

    const teamIds = userTeams.map((team) => team.id);

    const [sessionCounts] = await this.db
      .select({
        total: count(),
        active: sql<number>`sum(case when ${teamSessions.completedAt} is null then 1 else 0 end)`,
      })
      .from(teamSessions)
      .where(inArray(teamSessions.teamId, teamIds));

    const totalSessions = sessionCounts?.total ?? 0;
    const activeSessions = Number(sessionCounts?.active ?? 0);
    const completedSessions = totalSessions - activeSessions;

    const timelineSessions = await this.db
      .select({
        createdAt: teamSessions.createdAt,
        completedAt: teamSessions.completedAt,
      })
      .from(teamSessions)
      .where(
        and(
          inArray(teamSessions.teamId, teamIds),
          gte(teamSessions.createdAt, Date.now() - SIX_MONTHS_MS),
        ),
      );

    return {
      totalTeams: userTeams.length,
      totalSessions,
      activeSessions,
      completedSessions,
      sessionTimeline: this.buildSessionTimeline(timelineSessions),
    };
  }

  private buildSessionTimeline(
    sessions: Array<{ createdAt: number; completedAt: number | null }>,
  ) {
    const now = Date.now();
    const sixMonthsAgo = now - 6 * 30 * 24 * 60 * 60 * 1000;

    const monthCounts = new Map<string, number>();

    for (let index = 5; index >= 0; index--) {
      const date = new Date(now);
      date.setDate(1);
      date.setMonth(date.getMonth() - index);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthCounts.set(key, 0);
    }

    for (const session of sessions) {
      if (session.createdAt < sixMonthsAgo) {
        continue;
      }

      const date = new Date(session.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (monthCounts.has(key)) {
        monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
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
