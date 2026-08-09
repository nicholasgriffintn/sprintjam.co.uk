import type { D1Database } from "@cloudflare/workers-types";
import type {
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
import { and, eq, gt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { SESSION_EXPIRY_MS } from "../constants";
import type { SprintJamAuthUser } from "../lib/shared-auth";
import {
  mapSprintJamChallengeRecord,
  mapSprintJamSessionRecord,
  SprintJamChallengePayloadCipher,
} from "../lib/shared-auth-storage";

export interface SprintJamCoreAuthStores {
  readonly users: UserStore<SprintJamAuthUser>;
  readonly sessions: SessionStore;
  readonly challenges?: ChallengeStore;
}

export function createSprintJamCoreAuthStores(
  d1: D1Database,
  encryptionSecret?: string,
): SprintJamCoreAuthStores {
  const db = drizzle(d1);
  const challengeCipher = encryptionSecret
    ? new SprintJamChallengePayloadCipher(encryptionSecret)
    : null;

  const sessions: SessionStore = {
    async create(record) {
      await db.insert(workspaceSessions).values({
        userId: Number(record.userId),
        tokenHash: record.tokenHash,
        expiresAt: record.expiresAt.getTime(),
        createdAt: record.createdAt.getTime(),
        lastUsedAt: record.createdAt.getTime(),
      });
    },
    async findByTokenHash(tokenHash) {
      const row = await db
        .select({
          tokenHash: workspaceSessions.tokenHash,
          userId: workspaceSessions.userId,
          createdAt: workspaceSessions.createdAt,
          expiresAt: workspaceSessions.expiresAt,
        })
        .from(workspaceSessions)
        .where(eq(workspaceSessions.tokenHash, tokenHash))
        .get();
      return row ? mapSprintJamSessionRecord(row) : null;
    },
    async deleteByTokenHash(tokenHash) {
      await db
        .delete(workspaceSessions)
        .where(eq(workspaceSessions.tokenHash, tokenHash));
    },
    async rotateByTokenHash(currentTokenHash, replacement) {
      const [, consumed] = await d1.batch<{
        tokenHash: string;
        userId: number;
        createdAt: number;
        expiresAt: number;
      }>([
        d1
          .prepare(
            `INSERT INTO workspace_sessions
             (user_id, token_hash, expires_at, created_at, last_used_at)
             SELECT user_id, ?, ?, ?, ? FROM workspace_sessions
             WHERE token_hash = ? AND user_id = ? AND expires_at > ?`,
          )
          .bind(
            replacement.tokenHash,
            replacement.expiresAt.getTime(),
            replacement.createdAt.getTime(),
            replacement.createdAt.getTime(),
            currentTokenHash,
            Number(replacement.userId),
            replacement.createdAt.getTime(),
          ),
        d1
          .prepare(
            `DELETE FROM workspace_sessions
             WHERE token_hash = ? AND EXISTS (
               SELECT 1 FROM workspace_sessions WHERE token_hash = ?
             )
             RETURNING token_hash AS tokenHash, user_id AS userId,
               created_at AS createdAt, expires_at AS expiresAt`,
          )
          .bind(currentTokenHash, replacement.tokenHash),
      ]);
      const row = consumed?.results[0];
      return row ? mapSprintJamSessionRecord(row) : null;
    },
    async touchByTokenHash(tokenHash, expiresAt) {
      const now = expiresAt.getTime() - SESSION_EXPIRY_MS;
      const row = await db
        .update(workspaceSessions)
        .set({
          expiresAt: sql`MAX(${workspaceSessions.expiresAt}, ${expiresAt.getTime()})`,
          lastUsedAt: sql`MAX(${workspaceSessions.lastUsedAt}, ${now})`,
        })
        .where(
          and(
            eq(workspaceSessions.tokenHash, tokenHash),
            gt(workspaceSessions.expiresAt, now),
          ),
        )
        .returning({
          tokenHash: workspaceSessions.tokenHash,
          userId: workspaceSessions.userId,
          createdAt: workspaceSessions.createdAt,
          expiresAt: workspaceSessions.expiresAt,
        })
        .get();
      return row ? mapSprintJamSessionRecord(row) : null;
    },
    async deleteByUserId(userId) {
      await db
        .delete(workspaceSessions)
        .where(eq(workspaceSessions.userId, Number(userId)));
    },
  };

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
    sessions,
    ...(challengeCipher
      ? {
          challenges: {
            async create(record) {
              await db.insert(sharedAuthChallenges).values({
                tokenHash: record.tokenHash,
                provider: record.provider,
                kind: record.kind,
                payload: await challengeCipher.encrypt(record),
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
              return row
                ? mapSprintJamChallengeRecord(row, challengeCipher)
                : null;
            },
            async consumeByTokenHash(tokenHash) {
              const row = await db
                .delete(sharedAuthChallenges)
                .where(eq(sharedAuthChallenges.tokenHash, tokenHash))
                .returning()
                .get();
              return row
                ? mapSprintJamChallengeRecord(row, challengeCipher)
                : null;
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
          } satisfies ChallengeStore,
        }
      : {}),
  };
}
