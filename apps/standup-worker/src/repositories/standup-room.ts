import type { DurableObjectStorage } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import { and, eq, sql as sqlOperator } from "drizzle-orm";

import * as standupSchema from "@sprintjam/db/durable-objects/standup/schemas";
import {
  standupMeta,
  standupReactions,
  standupUsers,
  standupResponses,
  standupSessionTokens,
} from "@sprintjam/db/durable-objects/standup/schemas";
import type {
  InsertStandupMetaItem,
  InsertStandupReactionsItem,
  InsertStandupUsersItem,
  InsertStandupResponsesItem,
  InsertStandupSessionTokensItem,
  StandupDB,
} from "@sprintjam/db";
import type {
  StandupData,
  StandupResponse,
  StandupResponsePayload,
  LinkedTicket,
} from "@sprintjam/types";
import {
  isSessionTokenValid,
  safeJsonParse,
  serializePasscodeHash,
  parsePasscodeHash,
  hashRecoveryPasskey,
  verifyRecoveryPasskey,
  RECOVERY_PASSKEY_TTL_MS,
} from "@sprintjam/utils";

import migrations from "../../drizzle/migrations";

const STANDUP_ROW_ID = 1;

export class StandupRoomRepository {
  private readonly db: StandupDB;

  constructor(storage: DurableObjectStorage) {
    this.db = drizzle(storage, { schema: standupSchema });
  }

  async initializeSchema() {
    await migrate(this.db, migrations);
  }

  async getStandupData(): Promise<StandupData | undefined> {
    const row = await this.db
      .select()
      .from(standupMeta)
      .where(eq(standupMeta.id, STANDUP_ROW_ID))
      .get();

    if (!row) {
      return undefined;
    }

    const [users, responses] = await Promise.all([
      this.db.select().from(standupUsers).orderBy(standupUsers.ordinal).all(),
      this.db
        .select()
        .from(standupResponses)
        .orderBy(standupResponses.submittedAt)
        .all(),
    ]);

    const {
      users: userList,
      connectedUsers,
      userAvatars,
    } = this.mapUsersToState(users);

    const reactions = await this.getReactions();

    return {
      key: row.standupKey,
      users: userList,
      moderator: row.moderator,
      connectedUsers,
      status: row.status as StandupData["status"],
      responses: responses.map((r) => this.mapResponseRow(r)),
      respondedUsers: responses.map((r) => r.userName),
      userAvatars,
      teamId: row.teamId ?? undefined,
      reactions,
      presentationTheme: row.presentationTheme ?? "default",
    };
  }

  async createStandup(
    standupKey: string,
    moderator: string,
    passcode?: string,
    teamId?: number,
  ): Promise<void> {
    const now = Date.now();

    this.db
      .insert(standupMeta)
      .values({
        id: STANDUP_ROW_ID,
        standupKey,
        moderator,
        status: "active",
        passcode: passcode ?? null,
        teamId: teamId ?? null,
        presentationTheme: "default",
        createdAt: now,
      } satisfies InsertStandupMetaItem)
      .run();
  }

  ensureUser(userName: string): string {
    const canonicalName = this.findCanonicalUserName(userName);
    if (canonicalName) {
      return canonicalName;
    }

    this.db
      .insert(standupUsers)
      .values({
        userName,
        avatar: null,
        isConnected: 0,
        ordinal: this.getMaxUserOrdinal() + 1,
      } satisfies InsertStandupUsersItem)
      .onConflictDoNothing()
      .run();

    return userName;
  }

  setUserConnection(userName: string, isConnected: boolean) {
    const canonicalName = this.ensureUser(userName);
    this.db
      .update(standupUsers)
      .set({ isConnected: isConnected ? 1 : 0 })
      .where(eq(standupUsers.userName, canonicalName))
      .run();
  }

  setUserAvatar(userName: string, avatar?: string) {
    if (!avatar) {
      return;
    }
    const canonicalName = this.ensureUser(userName);
    this.db
      .update(standupUsers)
      .set({ avatar })
      .where(eq(standupUsers.userName, canonicalName))
      .run();
  }

  setStatus(status: StandupData["status"]) {
    this.db
      .update(standupMeta)
      .set({ status })
      .where(eq(standupMeta.id, STANDUP_ROW_ID))
      .run();
  }

  setTheme(theme: string) {
    this.db
      .update(standupMeta)
      .set({ presentationTheme: theme })
      .where(eq(standupMeta.id, STANDUP_ROW_ID))
      .run();
  }

  submitResponse(userName: string, payload: StandupResponsePayload): void {
    const now = Date.now();
    const canonicalName = this.ensureUser(userName);

    this.db
      .insert(standupResponses)
      .values({
        userName: canonicalName,
        isInPerson: payload.isInPerson ? 1 : 0,
        yesterday: payload.yesterday ?? "",
        today: payload.today ?? "",
        hasBlocker: payload.hasBlocker ? 1 : 0,
        blockerDescription: payload.blockerDescription ?? null,
        healthCheck: payload.healthCheck,
        linkedTickets: payload.linkedTickets
          ? JSON.stringify(payload.linkedTickets)
          : null,
        kudos: payload.kudos ?? null,
        icebreakerAnswer: payload.icebreakerAnswer ?? null,
        icebreakerQuestion: payload.icebreakerQuestion ?? null,
        isHealthCheckPrivate: payload.isHealthCheckPrivate ? 1 : 0,
        submittedAt: now,
        updatedAt: now,
      } satisfies InsertStandupResponsesItem)
      .onConflictDoUpdate({
        target: standupResponses.userName,
        set: {
          isInPerson: payload.isInPerson ? 1 : 0,
          yesterday: payload.yesterday ?? "",
          today: payload.today ?? "",
          hasBlocker: payload.hasBlocker ? 1 : 0,
          blockerDescription: payload.blockerDescription ?? null,
          healthCheck: payload.healthCheck,
          isHealthCheckPrivate: payload.isHealthCheckPrivate ? 1 : 0,
          linkedTickets: payload.linkedTickets
            ? JSON.stringify(payload.linkedTickets)
            : null,
          kudos: payload.kudos ?? null,
          icebreakerAnswer: payload.icebreakerAnswer ?? null,
          icebreakerQuestion: payload.icebreakerQuestion ?? null,
          updatedAt: now,
        },
      })
      .run();
  }

  addReaction(
    reactingUserName: string,
    responseUserName: string,
    emoji: string,
  ): void {
    this.db
      .insert(standupReactions)
      .values({
        responseUserName,
        reactingUserName,
        emoji,
      } satisfies InsertStandupReactionsItem)
      .onConflictDoNothing()
      .run();
  }

  removeReaction(
    reactingUserName: string,
    responseUserName: string,
    emoji: string,
  ): void {
    this.db
      .delete(standupReactions)
      .where(
        and(
          sqlOperator`LOWER(${standupReactions.responseUserName}) = LOWER(${responseUserName})`,
          sqlOperator`LOWER(${standupReactions.reactingUserName}) = LOWER(${reactingUserName})`,
          eq(standupReactions.emoji, emoji),
        ),
      )
      .run();
  }

  async getReactions(): Promise<Record<string, Record<string, string[]>>> {
    const rows = await this.db.select().from(standupReactions).all();
    const result: Record<string, Record<string, string[]>> = {};

    for (const row of rows) {
      if (!result[row.responseUserName]) {
        result[row.responseUserName] = {};
      }
      if (!result[row.responseUserName][row.emoji]) {
        result[row.responseUserName][row.emoji] = [];
      }
      result[row.responseUserName][row.emoji].push(row.reactingUserName);
    }

    return result;
  }

  getResponse(userName: string): StandupResponse | undefined {
    const row = this.db
      .select()
      .from(standupResponses)
      .where(
        sqlOperator`LOWER(${standupResponses.userName}) = LOWER(${userName})`,
      )
      .get();

    if (!row) {
      return undefined;
    }

    return this.mapResponseRow(row);
  }

  getAllResponses(): StandupResponse[] {
    const rows = this.db
      .select()
      .from(standupResponses)
      .orderBy(standupResponses.submittedAt)
      .all();

    return rows.map((r) => this.mapResponseRow(r));
  }

  getRespondedUsers(): string[] {
    const rows = this.db
      .select({ userName: standupResponses.userName })
      .from(standupResponses)
      .all();

    return rows.map((r) => r.userName);
  }

  setSessionToken(userName: string, token: string) {
    const canonicalName = this.ensureUser(userName);
    const tokenOwner = this.findTokenOwner(canonicalName) ?? canonicalName;
    const createdAt = Date.now();

    this.db
      .insert(standupSessionTokens)
      .values({
        userName: tokenOwner,
        token,
        createdAt,
      } satisfies InsertStandupSessionTokensItem)
      .onConflictDoUpdate({
        target: standupSessionTokens.userName,
        set: {
          token,
          createdAt,
        },
      })
      .run();
  }

  validateSessionToken(userName: string, token: string | null): boolean {
    const record = this.db
      .select({
        token: standupSessionTokens.token,
        createdAt: standupSessionTokens.createdAt,
      })
      .from(standupSessionTokens)
      .where(
        sqlOperator`LOWER(${standupSessionTokens.userName}) = LOWER(${userName})`,
      )
      .get();

    return isSessionTokenValid({
      storedToken: record?.token,
      providedToken: token,
      createdAt: record?.createdAt,
    });
  }

  async setRecoveryPasskey(userName: string, passkey: string): Promise<void> {
    const canonicalName = this.ensureUser(userName);
    const hashed = await hashRecoveryPasskey(passkey);
    const createdAt = Date.now();

    this.db
      .update(standupSessionTokens)
      .set({
        recoveryPasskey: serializePasscodeHash(hashed),
        recoveryPasskeyCreatedAt: createdAt,
      })
      .where(
        sqlOperator`LOWER(${standupSessionTokens.userName}) = LOWER(${canonicalName})`,
      )
      .run();
  }

  async validateRecoveryPasskey(
    userName: string,
    passkey: string,
  ): Promise<boolean> {
    const record = this.db
      .select({
        recoveryPasskey: standupSessionTokens.recoveryPasskey,
        recoveryPasskeyCreatedAt: standupSessionTokens.recoveryPasskeyCreatedAt,
      })
      .from(standupSessionTokens)
      .where(
        sqlOperator`LOWER(${standupSessionTokens.userName}) = LOWER(${userName})`,
      )
      .get();

    if (!record?.recoveryPasskey || !record.recoveryPasskeyCreatedAt) {
      return false;
    }

    if (
      Date.now() - record.recoveryPasskeyCreatedAt >
      RECOVERY_PASSKEY_TTL_MS
    ) {
      return false;
    }

    const stored = parsePasscodeHash(record.recoveryPasskey);
    if (!stored) {
      return false;
    }

    return verifyRecoveryPasskey(passkey, stored);
  }

  getPasscode(): string | null {
    const result = this.db
      .select({ passcode: standupMeta.passcode })
      .from(standupMeta)
      .where(eq(standupMeta.id, STANDUP_ROW_ID))
      .get();

    return result?.passcode ?? null;
  }

  private findCanonicalUserName(userName: string): string | undefined {
    return this.db
      .select({
        userName: standupUsers.userName,
      })
      .from(standupUsers)
      .where(sqlOperator`LOWER(${standupUsers.userName}) = LOWER(${userName})`)
      .get()?.userName;
  }

  private getMaxUserOrdinal(): number {
    return (
      this.db
        .select({
          maxOrdinal: sqlOperator<number>`COALESCE(MAX(${standupUsers.ordinal}), -1)`,
        })
        .from(standupUsers)
        .get()?.maxOrdinal ?? -1
    );
  }

  private findTokenOwner(userName: string): string | undefined {
    return this.db
      .select({ userName: standupSessionTokens.userName })
      .from(standupSessionTokens)
      .where(
        sqlOperator`LOWER(${standupSessionTokens.userName}) = LOWER(${userName})`,
      )
      .get()?.userName;
  }

  private mapUsersToState(
    users: Array<(typeof standupUsers)["$inferSelect"]>,
  ): {
    users: string[];
    connectedUsers: Record<string, boolean>;
    userAvatars?: Record<string, string>;
  } {
    const connectedUsers: Record<string, boolean> = {};
    const userAvatars: Record<string, string> = {};

    for (const user of users) {
      connectedUsers[user.userName] = !!user.isConnected;
      if (user.avatar) {
        userAvatars[user.userName] = user.avatar;
      }
    }

    return {
      users: users.map((user) => user.userName),
      connectedUsers,
      userAvatars:
        Object.keys(userAvatars).length > 0 ? userAvatars : undefined,
    };
  }

  private mapResponseRow(
    row: (typeof standupResponses)["$inferSelect"],
  ): StandupResponse {
    return {
      userName: row.userName,
      isInPerson: !!row.isInPerson,
      yesterday: row.yesterday || undefined,
      today: row.today || undefined,
      hasBlocker: !!row.hasBlocker,
      blockerDescription: row.blockerDescription ?? undefined,
      healthCheck: row.healthCheck,
      linkedTickets: row.linkedTickets
        ? (safeJsonParse<LinkedTicket[]>(row.linkedTickets) ?? undefined)
        : undefined,
      kudos: row.kudos ?? undefined,
      icebreakerAnswer: row.icebreakerAnswer ?? undefined,
      icebreakerQuestion: row.icebreakerQuestion ?? undefined,
      isHealthCheckPrivate: !!row.isHealthCheckPrivate,
      submittedAt: row.submittedAt,
      updatedAt: row.updatedAt,
    };
  }
}
