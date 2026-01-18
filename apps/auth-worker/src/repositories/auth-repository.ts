import { drizzle } from "drizzle-orm/d1";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import {
  allowedDomains,
  organisations,
  users,
  magicLinks,
  workspaceSessions,
  authChallenges,
  mfaCredentials,
  mfaRecoveryCodes,
  loginAuditLogs,
} from "@sprintjam/db";
import * as schema from "@sprintjam/db/d1/schemas";
import { extractDomain } from "@sprintjam/utils";

export class AuthRepository {
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

  async validateVerificationCode(
    email: string,
    codeHash: string,
  ): Promise<
    | { success: true; email: string }
    | { success: false; error: "invalid" | "expired" | "used" | "locked" }
  > {
    const link = await this.db
      .select()
      .from(magicLinks)
      .where(eq(magicLinks.email, email.toLowerCase()))
      .orderBy(desc(schema.magicLinks.createdAt))
      .get();

    if (!link) {
      return { success: false, error: "invalid" };
    }

    if (link.attempts >= 3) {
      return { success: false, error: "locked" };
    }

    if (link.expiresAt < Date.now()) {
      return { success: false, error: "expired" };
    }

    if (link.usedAt) {
      return { success: false, error: "used" };
    }

    if (link.tokenHash !== codeHash) {
      await this.db
        .update(magicLinks)
        .set({ attempts: link.attempts + 1 })
        .where(eq(magicLinks.id, link.id));
      return { success: false, error: "invalid" };
    }

    await this.db
      .update(magicLinks)
      .set({ usedAt: Date.now() })
      .where(eq(magicLinks.id, link.id));

    return { success: true, email: link.email };
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

    if (!result) {
      throw new Error("Failed to create or retrieve organisation");
    }

    return result.id;
  }

  async getOrCreateUser(
    email: string,
    organisationId: number,
  ): Promise<number> {
    const domain = extractDomain(email);
    const now = Date.now();

    await this.db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        emailDomain: domain,
        organisationId,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          lastLoginAt: now,
          updatedAt: now,
        },
      });

    const existing = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .get();

    if (!existing) {
      throw new Error("Failed to create or retrieve user");
    }

    return existing.id;
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

  async logAuditEvent({
    userId,
    email,
    event,
    status,
    reason,
    ip,
    userAgent,
  }: {
    userId?: number | null;
    email?: string | null;
    event: string;
    status: "success" | "failure";
    reason?: string | null;
    ip?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    await this.db.insert(loginAuditLogs).values({
      userId: userId ?? null,
      email: email ?? null,
      event,
      status,
      reason: reason ?? null,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
      createdAt: Date.now(),
    });
  }

  async createAuthChallenge({
    userId,
    tokenHash,
    type,
    method,
    metadata,
    expiresAt,
  }: {
    userId: number;
    tokenHash: string;
    type: "setup" | "verify";
    method?: string | null;
    metadata?: string | null;
    expiresAt: number;
  }): Promise<number> {
    const result = await this.db
      .insert(authChallenges)
      .values({
        userId,
        tokenHash,
        type,
        method: method ?? null,
        metadata: metadata ?? null,
        expiresAt,
        createdAt: Date.now(),
      })
      .returning({ id: authChallenges.id })
      .get();

    if (!result?.id) {
      throw new Error("Failed to create auth challenge");
    }

    return result.id;
  }

  async getAuthChallengeByTokenHash(tokenHash: string) {
    return await this.db
      .select()
      .from(authChallenges)
      .where(eq(authChallenges.tokenHash, tokenHash))
      .get();
  }

  async markAuthChallengeUsed(id: number): Promise<void> {
    await this.db
      .update(authChallenges)
      .set({ usedAt: Date.now() })
      .where(eq(authChallenges.id, id));
  }

  async updateAuthChallengeMetadata(
    id: number,
    metadata: string,
    method?: string | null,
  ): Promise<void> {
    await this.db
      .update(authChallenges)
      .set({
        metadata,
        method: method ?? null,
      })
      .where(eq(authChallenges.id, id));
  }

  async listMfaCredentials(userId: number) {
    return await this.db
      .select({
        id: mfaCredentials.id,
        type: mfaCredentials.type,
        credentialId: mfaCredentials.credentialId,
        publicKey: mfaCredentials.publicKey,
        secretEncrypted: mfaCredentials.secretEncrypted,
        counter: mfaCredentials.counter,
        createdAt: mfaCredentials.createdAt,
      })
      .from(mfaCredentials)
      .where(eq(mfaCredentials.userId, userId))
      .orderBy(desc(mfaCredentials.createdAt))
      .all();
  }

  async getTotpCredential(userId: number) {
    return await this.db
      .select({
        id: mfaCredentials.id,
        secretEncrypted: mfaCredentials.secretEncrypted,
      })
      .from(mfaCredentials)
      .where(and(eq(mfaCredentials.userId, userId), eq(mfaCredentials.type, "totp")))
      .orderBy(desc(mfaCredentials.createdAt))
      .get();
  }

  async listWebAuthnCredentials(userId: number) {
    return await this.db
      .select({
        id: mfaCredentials.id,
        credentialId: mfaCredentials.credentialId,
        publicKey: mfaCredentials.publicKey,
        counter: mfaCredentials.counter,
      })
      .from(mfaCredentials)
      .where(and(eq(mfaCredentials.userId, userId), eq(mfaCredentials.type, "webauthn")))
      .all();
  }

  async getWebAuthnCredentialById(credentialId: string) {
    return await this.db
      .select({
        id: mfaCredentials.id,
        credentialId: mfaCredentials.credentialId,
        userId: mfaCredentials.userId,
        publicKey: mfaCredentials.publicKey,
        counter: mfaCredentials.counter,
      })
      .from(mfaCredentials)
      .where(eq(mfaCredentials.credentialId, credentialId))
      .get();
  }

  async createTotpCredential(
    userId: number,
    secretEncrypted: string,
  ): Promise<void> {
    const now = Date.now();
    await this.db.insert(mfaCredentials).values({
      userId,
      type: "totp",
      secretEncrypted,
      createdAt: now,
      updatedAt: now,
    });
  }

  async createWebAuthnCredential({
    userId,
    credentialId,
    publicKey,
    counter,
  }: {
    userId: number;
    credentialId: string;
    publicKey: string;
    counter: number;
  }): Promise<void> {
    const now = Date.now();
    await this.db.insert(mfaCredentials).values({
      userId,
      type: "webauthn",
      credentialId,
      publicKey,
      counter,
      createdAt: now,
      updatedAt: now,
    });
  }

  async updateWebAuthnCounter(id: number, counter: number): Promise<void> {
    await this.db
      .update(mfaCredentials)
      .set({ counter, updatedAt: Date.now() })
      .where(eq(mfaCredentials.id, id));
  }

  async storeRecoveryCodes(
    userId: number,
    codeHashes: string[],
  ): Promise<void> {
    const createdAt = Date.now();
    const values = codeHashes.map((hash) => ({
      userId,
      codeHash: hash,
      createdAt,
    }));
    await this.db.insert(mfaRecoveryCodes).values(values);
  }

  async consumeRecoveryCode(
    userId: number,
    codeHash: string,
  ): Promise<boolean> {
    const code = await this.db
      .select({ id: mfaRecoveryCodes.id })
      .from(mfaRecoveryCodes)
      .where(
        and(
          eq(mfaRecoveryCodes.userId, userId),
          eq(mfaRecoveryCodes.codeHash, codeHash),
          isNull(mfaRecoveryCodes.usedAt),
        ),
      )
      .get();

    if (!code?.id) {
      return false;
    }

    await this.db
      .update(mfaRecoveryCodes)
      .set({ usedAt: Date.now() })
      .where(eq(mfaRecoveryCodes.id, code.id));

    return true;
  }

  async cleanupExpiredMagicLinks(): Promise<number> {
    const expiredLinks = await this.db
      .select({ id: magicLinks.id })
      .from(magicLinks)
      .where(eq(magicLinks.expiresAt, Date.now()))
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
      .where(eq(workspaceSessions.expiresAt, Date.now()))
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
