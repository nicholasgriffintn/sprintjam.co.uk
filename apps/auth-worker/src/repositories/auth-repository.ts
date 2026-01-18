import { drizzle } from "drizzle-orm/d1";
import { eq, inArray } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import {
  allowedDomains,
  organisations,
  users,
  magicLinks,
  workspaceSessions,
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
      .orderBy(schema.magicLinks.createdAt)
      .get();

    if (!link) {
      return { success: false, error: "invalid" };
    }

    if (link.attempts >= 5) {
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

    if (!existing) {
      throw new Error("Failed to create or retrieve user");
    }

    await this.db
      .update(users)
      .set({ lastLoginAt: Date.now(), updatedAt: Date.now() })
      .where(eq(users.id, existing.id));

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
