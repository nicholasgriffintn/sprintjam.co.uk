import type { D1Database } from "@cloudflare/workers-types";
import type {
  AuthChallengeKind,
  AuthChallengeRecord,
  AuthSessionRecord,
  ChallengeStore,
  SessionStore,
  UserStore,
} from "@ngriffin_uk/auth-core";
import {
  sharedAuthChallenges,
  users,
  workspaceMemberships,
  workspaceSessions,
} from "@sprintjam/db";
import { isRecord } from "@sprintjam/utils";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { SESSION_LAST_USED_UPDATE_THRESHOLD_MS } from "../constants";
import type { SprintJamAuthUser } from "../lib/shared-auth";

export interface SprintJamCoreAuthStores {
  readonly users: UserStore<SprintJamAuthUser>;
  readonly sessions: SessionStore;
  readonly challenges: ChallengeStore;
}

export function createSprintJamCoreAuthStores(
  d1: D1Database,
): SprintJamCoreAuthStores {
  const db = drizzle(d1);

  return {
    users: {
      async findById(userId) {
        const id = Number(userId);
        if (!Number.isSafeInteger(id)) return null;
        const row = await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            organisationId: users.organisationId,
            createdAt: users.createdAt,
            workspaceRole: workspaceMemberships.role,
          })
          .from(users)
          .innerJoin(
            workspaceMemberships,
            and(
              eq(workspaceMemberships.userId, users.id),
              eq(workspaceMemberships.organisationId, users.organisationId),
              eq(workspaceMemberships.status, "active"),
            ),
          )
          .where(eq(users.id, id))
          .get();
        return row
          ? {
              id: String(row.id),
              email: row.email,
              name: row.name,
              organisationId: row.organisationId,
              createdAt: new Date(row.createdAt),
              workspaceRole: row.workspaceRole,
            }
          : null;
      },
    },
    sessions: {
      async create(record) {
        await db.insert(workspaceSessions).values({
          userId: Number(record.userId),
          tokenHash: record.tokenHash,
          expiresAt: record.expiresAt.getTime(),
          createdAt: record.createdAt.getTime(),
          lastUsedAt: Date.now(),
        });
      },
      async findByTokenHash(tokenHash) {
        const row = await db
          .select({
            tokenHash: workspaceSessions.tokenHash,
            userId: workspaceSessions.userId,
            createdAt: workspaceSessions.createdAt,
            expiresAt: workspaceSessions.expiresAt,
            lastUsedAt: workspaceSessions.lastUsedAt,
          })
          .from(workspaceSessions)
          .where(eq(workspaceSessions.tokenHash, tokenHash))
          .get();
        if (!row) return null;
        const now = Date.now();
        if (now - row.lastUsedAt > SESSION_LAST_USED_UPDATE_THRESHOLD_MS) {
          await db
            .update(workspaceSessions)
            .set({ lastUsedAt: now })
            .where(eq(workspaceSessions.tokenHash, tokenHash));
        }
        return mapSession(row);
      },
      async deleteByTokenHash(tokenHash) {
        await db
          .delete(workspaceSessions)
          .where(eq(workspaceSessions.tokenHash, tokenHash));
      },
    },
    challenges: {
      async create(record) {
        await db.insert(sharedAuthChallenges).values({
          tokenHash: record.tokenHash,
          provider: record.provider,
          kind: record.kind,
          payload: JSON.stringify(record.payload),
          createdAt: record.createdAt.getTime(),
          expiresAt: record.expiresAt.getTime(),
          attempts: record.attempts,
        });
      },
      async findByTokenHash(tokenHash) {
        const row = await db
          .select()
          .from(sharedAuthChallenges)
          .where(eq(sharedAuthChallenges.tokenHash, tokenHash))
          .get();
        return row ? mapChallenge(row) : null;
      },
      async consumeByTokenHash(tokenHash) {
        const row = await db
          .delete(sharedAuthChallenges)
          .where(eq(sharedAuthChallenges.tokenHash, tokenHash))
          .returning()
          .get();
        return row ? mapChallenge(row) : null;
      },
      async incrementAttempts(tokenHash, expectedAttempts) {
        const updated = await db
          .update(sharedAuthChallenges)
          .set({ attempts: expectedAttempts + 1 })
          .where(
            and(
              eq(sharedAuthChallenges.tokenHash, tokenHash),
              eq(sharedAuthChallenges.attempts, expectedAttempts),
            ),
          )
          .returning({ tokenHash: sharedAuthChallenges.tokenHash })
          .get();
        return Boolean(updated);
      },
    },
  };
}

function mapSession(row: {
  readonly tokenHash: string;
  readonly userId: number;
  readonly createdAt: number;
  readonly expiresAt: number;
}): AuthSessionRecord {
  return {
    tokenHash: row.tokenHash,
    userId: String(row.userId),
    createdAt: new Date(row.createdAt),
    expiresAt: new Date(row.expiresAt),
  };
}

function mapChallenge(row: {
  readonly tokenHash: string;
  readonly provider: string;
  readonly kind: string;
  readonly payload: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly attempts: number;
}): AuthChallengeRecord {
  if (!isAuthChallengeKind(row.kind)) {
    throw new TypeError("Stored authentication challenge kind is invalid.");
  }
  const payload: unknown = JSON.parse(row.payload);
  if (!isRecord(payload)) {
    throw new TypeError("Stored authentication challenge payload is invalid.");
  }
  return {
    tokenHash: row.tokenHash,
    provider: row.provider,
    kind: row.kind,
    payload,
    createdAt: new Date(row.createdAt),
    expiresAt: new Date(row.expiresAt),
    attempts: row.attempts,
  };
}

function isAuthChallengeKind(value: string): value is AuthChallengeKind {
  return [
    "custom",
    "email_otp",
    "email_verification",
    "mfa_selection",
    "mfa_setup",
    "new_password",
    "password",
    "password_reset",
    "sms_mfa",
    "sms_otp",
    "software_token_mfa",
    "unsupported",
    "webauthn",
  ].includes(value);
}
