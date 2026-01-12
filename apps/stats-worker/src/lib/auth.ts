import type {
  Request as CfRequest,
  D1Database,
} from '@cloudflare/workers-types';
import { getSessionTokenFromRequest, hashToken } from '@sprintjam/utils';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, gt, inArray } from 'drizzle-orm';
import { workspaceSessions, users, teams, teamSessions } from '@sprintjam/db';

export interface AuthResult {
  userId: number;
  email: string;
  organisationId: number;
}

export interface AuthError {
  status: 'error';
  code: 'unauthorized' | 'expired';
}

export async function authenticateRequest(
  request: CfRequest,
  db: D1Database
): Promise<AuthResult | AuthError> {
  const token = getSessionTokenFromRequest(request);
  if (!token) {
    return { status: 'error', code: 'unauthorized' };
  }

  const tokenHash = await hashToken(token);
  const drizzleDb = drizzle(db);
  const now = Math.floor(Date.now() / 1000);

  const result = await drizzleDb
    .select({
      userId: workspaceSessions.userId,
      email: users.email,
      organisationId: users.organisationId,
    })
    .from(workspaceSessions)
    .innerJoin(users, eq(workspaceSessions.userId, users.id))
    .where(
      and(
        eq(workspaceSessions.tokenHash, tokenHash),
        gt(workspaceSessions.expiresAt, now)
      )
    )
    .get();

  if (!result) {
    return { status: 'error', code: 'expired' };
  }

  return {
    userId: result.userId,
    email: result.email,
    organisationId: result.organisationId,
  };
}

export async function isUserInTeam(
  db: D1Database,
  userId: number,
  teamId: number
): Promise<boolean> {
  const drizzleDb = drizzle(db);

  const user = await drizzleDb
    .select({ organisationId: users.organisationId })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!user) return false;

  const team = await drizzleDb
    .select({ organisationId: teams.organisationId })
    .from(teams)
    .where(eq(teams.id, teamId))
    .get();

  if (!team) return false;

  return user.organisationId === team.organisationId;
}

export async function canUserAccessRoom(
  db: D1Database,
  organisationId: number,
  roomKey: string
): Promise<boolean> {
  const drizzleDb = drizzle(db);

  const session = await drizzleDb
    .select({
      teamId: teamSessions.teamId,
      organisationId: teams.organisationId,
    })
    .from(teamSessions)
    .innerJoin(teams, eq(teamSessions.teamId, teams.id))
    .where(eq(teamSessions.roomKey, roomKey))
    .get();

  if (!session) {
    return false;
  }

  return session.organisationId === organisationId;
}

export async function filterAccessibleRoomKeys(
  db: D1Database,
  organisationId: number,
  roomKeys: string[]
): Promise<string[]> {
  if (roomKeys.length === 0) return [];

  const drizzleDb = drizzle(db);

  const accessibleSessions = await drizzleDb
    .select({
      roomKey: teamSessions.roomKey,
    })
    .from(teamSessions)
    .innerJoin(teams, eq(teamSessions.teamId, teams.id))
    .where(
      and(
        inArray(teamSessions.roomKey, roomKeys),
        eq(teams.organisationId, organisationId)
      )
    )
    .all();

  return accessibleSessions.map((s) => s.roomKey);
}
