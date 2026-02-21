import type { DurableObjectStorage } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import { eq, sql as sqlOperator } from "drizzle-orm";

import * as wheelSchema from "@sprintjam/db/durable-objects/wheel/schemas";
import {
  wheelMeta,
  wheelEntries,
  wheelUsers,
  wheelResults,
  wheelSessionTokens,
} from "@sprintjam/db/durable-objects/wheel/schemas";
import type {
  InsertWheelEntriesItem,
  InsertWheelMetaItem,
  InsertWheelResultsItem,
  InsertWheelSessionTokensItem,
  InsertWheelUsersItem,
  WheelDB,
} from "@sprintjam/db";
import type {
  WheelData,
  WheelEntry,
  WheelSettings,
  SpinState,
  SpinResult,
  PasscodeHashPayload,
} from "@sprintjam/types";
import {
  isSessionTokenValid,
  parsePasscodeHash,
  serializePasscodeHash,
  safeJsonParse,
} from "@sprintjam/utils";

import migrations from "../../drizzle/migrations";

const WHEEL_ROW_ID = 1;

export class WheelRoomRepository {
  private readonly db: WheelDB;

  constructor(storage: DurableObjectStorage) {
    this.db = drizzle(storage, { schema: wheelSchema });
  }

  async initializeSchema() {
    await migrate(this.db, migrations);
  }

  async getWheelData(): Promise<WheelData | undefined> {
    const row = await this.db
      .select()
      .from(wheelMeta)
      .where(eq(wheelMeta.id, WHEEL_ROW_ID))
      .get();

    if (!row) {
      return undefined;
    }

    const users = await this.db
      .select()
      .from(wheelUsers)
      .orderBy(wheelUsers.ordinal)
      .all();

    const entries = await this.db
      .select()
      .from(wheelEntries)
      .orderBy(wheelEntries.ordinal)
      .all();

    const results = await this.db
      .select()
      .from(wheelResults)
      .orderBy(wheelResults.timestamp)
      .all();

    const connectedUsers: Record<string, boolean> = {};
    const userAvatars: Record<string, string> = {};
    const userList: string[] = [];

    for (const user of users) {
      userList.push(user.userName);
      connectedUsers[user.userName] = !!user.isConnected;
      if (user.avatar) {
        userAvatars[user.userName] = user.avatar;
      }
    }

    const settings = safeJsonParse<WheelSettings>(row.settings);
    if (!settings) {
      throw new Error("Failed to parse wheel settings from storage");
    }

    const spinState = row.spinState
      ? safeJsonParse<SpinState>(row.spinState)
      : null;

    const wheelData: WheelData = {
      key: row.wheelKey,
      entries: entries.map((e) => ({
        id: e.entryId,
        name: e.name,
        enabled: !!e.enabled,
      })),
      moderator: row.moderator,
      users: userList,
      connectedUsers,
      spinState: spinState ?? null,
      results: results.map((r) => ({
        id: r.resultId,
        winner: r.winner,
        timestamp: r.timestamp,
        removedAfter: !!r.removedAfter,
      })),
      settings,
      status: row.wheelStatus === "completed" ? "completed" : "active",
      passcodeHash: parsePasscodeHash(row.passcode) ?? undefined,
      userAvatars:
        Object.keys(userAvatars).length > 0 ? userAvatars : undefined,
    };

    return wheelData;
  }

  async replaceWheelData(wheelData: WheelData): Promise<void> {
    await this.db.transaction((tx) => {
      const metaValues: InsertWheelMetaItem = {
        id: WHEEL_ROW_ID,
        wheelKey: wheelData.key,
        moderator: wheelData.moderator,
        wheelStatus: wheelData.status ?? "active",
        passcode: serializePasscodeHash(wheelData.passcodeHash),
        settings: JSON.stringify(wheelData.settings),
        spinState: wheelData.spinState ? JSON.stringify(wheelData.spinState) : null,
      };

      tx.insert(wheelMeta)
        .values(metaValues)
        .onConflictDoUpdate({
          target: wheelMeta.id,
          set: {
            wheelKey: metaValues.wheelKey,
            moderator: metaValues.moderator,
            wheelStatus: metaValues.wheelStatus,
            passcode: metaValues.passcode,
            settings: metaValues.settings,
            spinState: metaValues.spinState,
          },
        })
        .run();

      tx.delete(wheelUsers).run();
      wheelData.users.forEach((user, index) => {
        const userValues: InsertWheelUsersItem = {
          userName: user,
          avatar: wheelData.userAvatars?.[user] ?? null,
          isConnected: wheelData.connectedUsers?.[user] ? 1 : 0,
          ordinal: index,
        };
        tx.insert(wheelUsers)
          .values(userValues)
          .run();
      });

      tx.delete(wheelEntries).run();
      wheelData.entries.forEach((entry, index) => {
        const entryValues: InsertWheelEntriesItem = {
          entryId: entry.id,
          name: entry.name,
          enabled: entry.enabled ? 1 : 0,
          ordinal: index,
        };
        tx.insert(wheelEntries)
          .values(entryValues)
          .run();
      });

      tx.delete(wheelResults).run();
      wheelData.results.forEach((result) => {
        const resultValues: InsertWheelResultsItem = {
          resultId: result.id,
          winner: result.winner,
          timestamp: result.timestamp,
          removedAfter: result.removedAfter ? 1 : 0,
        };
        tx.insert(wheelResults)
          .values(resultValues)
          .run();
      });
    });
  }

  ensureUser(userName: string): string {
    const canonicalName = this.findCanonicalUserName(userName) ?? userName;
    const maxOrdinal = this.getMaxUserOrdinal();

    this.db
      .insert(wheelUsers)
      .values({
        userName: canonicalName,
        avatar: null,
        isConnected: 0,
        ordinal: maxOrdinal + 1,
      } satisfies InsertWheelUsersItem)
      .onConflictDoNothing()
      .run();

    return canonicalName;
  }

  setUserConnection(userName: string, isConnected: boolean) {
    const canonicalName = this.ensureUser(userName);
    this.db
      .update(wheelUsers)
      .set({ isConnected: isConnected ? 1 : 0 })
      .where(eq(wheelUsers.userName, canonicalName))
      .run();
  }

  setUserAvatar(userName: string, avatar?: string) {
    if (!avatar) {
      return;
    }
    const canonicalName = this.ensureUser(userName);
    this.db
      .update(wheelUsers)
      .set({ avatar })
      .where(eq(wheelUsers.userName, canonicalName))
      .run();
  }

  setModerator(userName: string) {
    this.db
      .update(wheelMeta)
      .set({ moderator: userName })
      .where(eq(wheelMeta.id, WHEEL_ROW_ID))
      .run();
  }

  setWheelStatus(status: "active" | "completed") {
    this.db
      .update(wheelMeta)
      .set({ wheelStatus: status })
      .where(eq(wheelMeta.id, WHEEL_ROW_ID))
      .run();
  }

  setSettings(settings: WheelSettings) {
    this.db
      .update(wheelMeta)
      .set({ settings: JSON.stringify(settings) })
      .where(eq(wheelMeta.id, WHEEL_ROW_ID))
      .run();
  }

  setSpinState(spinState: SpinState | null) {
    this.db
      .update(wheelMeta)
      .set({ spinState: spinState ? JSON.stringify(spinState) : null })
      .where(eq(wheelMeta.id, WHEEL_ROW_ID))
      .run();
  }

  addEntry(entry: WheelEntry): void {
    const maxOrdinal = this.getMaxEntryOrdinal();

    this.db
      .insert(wheelEntries)
      .values({
        entryId: entry.id,
        name: entry.name,
        enabled: entry.enabled ? 1 : 0,
        ordinal: maxOrdinal + 1,
      } satisfies InsertWheelEntriesItem)
      .run();
  }

  updateEntry(entryId: string, name: string): void {
    this.db
      .update(wheelEntries)
      .set({ name })
      .where(eq(wheelEntries.entryId, entryId))
      .run();
  }

  toggleEntry(entryId: string, enabled: boolean): void {
    this.db
      .update(wheelEntries)
      .set({ enabled: enabled ? 1 : 0 })
      .where(eq(wheelEntries.entryId, entryId))
      .run();
  }

  removeEntry(entryId: string): void {
    this.db.delete(wheelEntries).where(eq(wheelEntries.entryId, entryId)).run();
  }

  clearEntries(): void {
    this.db.delete(wheelEntries).run();
  }

  getEntries(): WheelEntry[] {
    const rows = this.db
      .select()
      .from(wheelEntries)
      .orderBy(wheelEntries.ordinal)
      .all();

    return rows.map((r) => ({
      id: r.entryId,
      name: r.name,
      enabled: !!r.enabled,
    }));
  }

  addResult(result: SpinResult): void {
    this.db
      .insert(wheelResults)
      .values({
        resultId: result.id,
        winner: result.winner,
        timestamp: result.timestamp,
        removedAfter: result.removedAfter ? 1 : 0,
      } satisfies InsertWheelResultsItem)
      .run();
  }

  getResults(): SpinResult[] {
    const rows = this.db
      .select()
      .from(wheelResults)
      .orderBy(wheelResults.timestamp)
      .all();

    return rows.map((r) => ({
      id: r.resultId,
      winner: r.winner,
      timestamp: r.timestamp,
      removedAfter: !!r.removedAfter,
    }));
  }

  clearResults(): void {
    this.db.delete(wheelResults).run();
  }

  getPasscodeHash(): PasscodeHashPayload | null {
    const result = this.db
      .select({ passcode: wheelMeta.passcode })
      .from(wheelMeta)
      .where(eq(wheelMeta.id, WHEEL_ROW_ID))
      .get();

    return parsePasscodeHash(result?.passcode ?? null);
  }

  setPasscodeHash(passcodeHash: PasscodeHashPayload | undefined) {
    this.db
      .update(wheelMeta)
      .set({ passcode: serializePasscodeHash(passcodeHash) })
      .where(eq(wheelMeta.id, WHEEL_ROW_ID))
      .run();
  }

  setSessionToken(userName: string, token: string) {
    const canonicalName = this.ensureUser(userName);
    const tokenOwner = this.findTokenOwner(canonicalName) ?? canonicalName;
    const createdAt = Date.now();

    this.db
      .insert(wheelSessionTokens)
      .values({
        userName: tokenOwner,
        token,
        createdAt,
      } satisfies InsertWheelSessionTokensItem)
      .onConflictDoUpdate({
        target: wheelSessionTokens.userName,
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
        token: wheelSessionTokens.token,
        createdAt: wheelSessionTokens.createdAt,
      })
      .from(wheelSessionTokens)
      .where(
        sqlOperator`LOWER(${wheelSessionTokens.userName}) = LOWER(${userName})`,
      )
      .get();

    return isSessionTokenValid({
      storedToken: record?.token,
      providedToken: token,
      createdAt: record?.createdAt,
    });
  }

  private findCanonicalUserName(userName: string): string | undefined {
    return this.db
      .select({
        userName: wheelUsers.userName,
      })
      .from(wheelUsers)
      .where(sqlOperator`LOWER(${wheelUsers.userName}) = LOWER(${userName})`)
      .get()?.userName;
  }

  private getMaxUserOrdinal(): number {
    return (
      this.db
        .select({
          maxOrdinal: sqlOperator<number>`COALESCE(MAX(${wheelUsers.ordinal}), -1)`,
        })
        .from(wheelUsers)
        .get()?.maxOrdinal ?? -1
    );
  }

  private getMaxEntryOrdinal(): number {
    return (
      this.db
        .select({
          maxOrdinal: sqlOperator<number>`COALESCE(MAX(${wheelEntries.ordinal}), -1)`,
        })
        .from(wheelEntries)
        .get()?.maxOrdinal ?? -1
    );
  }

  private findTokenOwner(userName: string): string | undefined {
    return this.db
      .select({ userName: wheelSessionTokens.userName })
      .from(wheelSessionTokens)
      .where(
        sqlOperator`LOWER(${wheelSessionTokens.userName}) = LOWER(${userName})`,
      )
      .get()?.userName;
  }
}
