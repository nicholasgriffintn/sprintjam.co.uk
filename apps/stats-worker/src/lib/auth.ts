import type {
  Request as CfRequest,
  D1Database,
} from "@cloudflare/workers-types";
import { getSessionTokenFromRequest, hashToken } from "@sprintjam/utils";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, gt, inArray, or } from "drizzle-orm";
import {
  workspaceSessions,
  workspaceMemberships,
  users,
  teams,
  teamMemberships,
  teamSessions,
} from "@sprintjam/db";

export interface AuthResult {
  userId: number;
  email: string;
  organisationId: number;
  workspaceRole?: "admin" | "member";
}

export interface AuthError {
  status: "error";
  code: "unauthorized" | "expired";
}

function hasTeamAccess(
  accessPolicy: "open" | "restricted",
  membershipUserId: number | null,
  userId: number,
  isWorkspaceAdmin: boolean,
): boolean {
  return (
    isWorkspaceAdmin || accessPolicy === "open" || membershipUserId === userId
  );
}

export function isAuthError(
  result: AuthResult | AuthError,
): result is AuthError {
  return "status" in result && result.status === "error";
}

export async function authenticateRequest(
  request: CfRequest,
  db: D1Database,
): Promise<AuthResult | AuthError> {
  const token = getSessionTokenFromRequest(request);
  if (!token) {
    return { status: "error", code: "unauthorized" };
  }

  const tokenHash = await hashToken(token);
  const drizzleDb = drizzle(db);
  const now = Date.now();

  const result = await drizzleDb
    .select({
      userId: workspaceSessions.userId,
      email: users.email,
      organisationId: users.organisationId,
      workspaceRole: workspaceMemberships.role,
    })
    .from(workspaceSessions)
    .innerJoin(users, eq(workspaceSessions.userId, users.id))
    .innerJoin(
      workspaceMemberships,
      and(
        eq(workspaceMemberships.userId, users.id),
        eq(workspaceMemberships.organisationId, users.organisationId),
        eq(workspaceMemberships.status, "active"),
      ),
    )
    .where(
      and(
        eq(workspaceSessions.tokenHash, tokenHash),
        gt(workspaceSessions.expiresAt, now),
      ),
    )
    .get();

  if (!result) {
    return { status: "error", code: "expired" };
  }

  return {
    userId: result.userId,
    email: result.email,
    organisationId: result.organisationId,
    workspaceRole: result.workspaceRole,
  };
}

export async function isUserInTeam(
  db: D1Database,
  userId: number,
  organisationId: number,
  isWorkspaceAdmin: boolean,
  teamId: number,
): Promise<boolean> {
  const drizzleDb = drizzle(db);
  const team = await drizzleDb
    .select({
      organisationId: teams.organisationId,
      accessPolicy: teams.accessPolicy,
      membershipUserId: teamMemberships.userId,
    })
    .from(teams)
    .leftJoin(
      teamMemberships,
      and(
        eq(teamMemberships.teamId, teams.id),
        eq(teamMemberships.userId, userId),
        eq(teamMemberships.status, "active"),
      ),
    )
    .where(eq(teams.id, teamId))
    .get();

  if (!team || team.organisationId !== organisationId) {
    return false;
  }

  return hasTeamAccess(
    team.accessPolicy,
    team.membershipUserId ?? null,
    userId,
    isWorkspaceAdmin,
  );
}

export async function canUserAccessRoom(
  db: D1Database,
  userId: number,
  organisationId: number,
  isWorkspaceAdmin: boolean,
  roomKey: string,
): Promise<boolean> {
  const drizzleDb = drizzle(db);

  const session = await drizzleDb
    .select({
      organisationId: teams.organisationId,
      accessPolicy: teams.accessPolicy,
      membershipUserId: teamMemberships.userId,
    })
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
    .where(eq(teamSessions.roomKey, roomKey))
    .get();

  if (!session) {
    return false;
  }

  if (session.organisationId !== organisationId) {
    return false;
  }

  return hasTeamAccess(
    session.accessPolicy,
    session.membershipUserId ?? null,
    userId,
    isWorkspaceAdmin,
  );
}

export async function filterAccessibleRoomKeys(
  db: D1Database,
  userId: number,
  organisationId: number,
  isWorkspaceAdmin: boolean,
  roomKeys: string[],
): Promise<string[]> {
  if (roomKeys.length === 0) return [];

  const drizzleDb = drizzle(db);

  const accessibleSessions = await drizzleDb
    .select({
      roomKey: teamSessions.roomKey,
    })
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
        inArray(teamSessions.roomKey, roomKeys),
        eq(teams.organisationId, organisationId),
        isWorkspaceAdmin
          ? and(eq(teams.organisationId, organisationId))
          : or(
              eq(teams.accessPolicy, "open"),
              eq(teamMemberships.userId, userId),
            ),
      ),
    )
    .all();

  return accessibleSessions.map((s) => s.roomKey);
}

export async function getUserTeamIds(
  db: D1Database,
  userId: number,
  organisationId: number,
  isWorkspaceAdmin: boolean,
): Promise<number[]> {
  const drizzleDb = drizzle(db);

  const userTeams = isWorkspaceAdmin
    ? await drizzleDb
        .select({ id: teams.id })
        .from(teams)
        .where(eq(teams.organisationId, organisationId))
        .all()
    : await drizzleDb
        .select({ id: teams.id })
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
        .all();

  return userTeams.map((t) => t.id);
}
