import type { DurableObjectStorage } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/durable-sqlite';
import { migrate } from 'drizzle-orm/durable-sqlite/migrator';
import { eq, sql as sqlOperator } from 'drizzle-orm';

import {
  wheelMeta,
  wheelEntries,
  wheelUsers,
  wheelResults,
  wheelSessionTokens,
} from '@sprintjam/db/durable-objects/wheel/schemas';
import type {
  WheelData,
  WheelEntry,
  WheelSettings,
  SpinState,
  SpinResult,
  PasscodeHashPayload,
} from '@sprintjam/types';
import {
  SESSION_TOKEN_TTL_MS,
  parsePasscodeHash,
  serializePasscodeHash,
  safeJsonParse,
} from '@sprintjam/utils';

import migrations from '../../drizzle/migrations';

const WHEEL_ROW_ID = 1;

type DB = ReturnType<typeof drizzle>;

export class WheelRoomRepository {
  private readonly db: DB;

  constructor(storage: DurableObjectStorage) {
    this.db = drizzle(storage);
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

    let settings: WheelSettings;
    try {
      const settingsData = safeJsonParse<WheelSettings>(row.settings);
      if (!settingsData) {
        throw new Error('Failed to parse wheel settings from storage');
      }
      settings = settingsData;
    } catch {
      throw new Error('Failed to parse wheel settings from storage');
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
      status: row.wheelStatus === 'completed' ? 'completed' : 'active',
      passcodeHash: parsePasscodeHash(row.passcode) ?? undefined,
      userAvatars:
        Object.keys(userAvatars).length > 0 ? userAvatars : undefined,
    };

    return wheelData;
  }

  async replaceWheelData(wheelData: WheelData): Promise<void> {
    await this.db.transaction((tx) => {
      tx.insert(wheelMeta)
        .values({
          id: WHEEL_ROW_ID,
          wheelKey: wheelData.key,
          moderator: wheelData.moderator,
          wheelStatus: wheelData.status ?? 'active',
          passcode: serializePasscodeHash(wheelData.passcodeHash),
          settings: JSON.stringify(wheelData.settings),
          spinState: wheelData.spinState
            ? JSON.stringify(wheelData.spinState)
            : null,
        })
        .onConflictDoUpdate({
          target: wheelMeta.id,
          set: {
            wheelKey: wheelData.key,
            moderator: wheelData.moderator,
            wheelStatus: wheelData.status ?? 'active',
            passcode: serializePasscodeHash(wheelData.passcodeHash),
            settings: JSON.stringify(wheelData.settings),
            spinState: wheelData.spinState
              ? JSON.stringify(wheelData.spinState)
              : null,
          },
        })
        .run();

      tx.delete(wheelUsers).run();
      wheelData.users.forEach((user, index) => {
        tx.insert(wheelUsers)
          .values({
            userName: user,
            avatar: wheelData.userAvatars?.[user] ?? null,
            isConnected: wheelData.connectedUsers?.[user] ? 1 : 0,
            ordinal: index,
          })
          .run();
      });

      tx.delete(wheelEntries).run();
      wheelData.entries.forEach((entry, index) => {
        tx.insert(wheelEntries)
          .values({
            entryId: entry.id,
            name: entry.name,
            enabled: entry.enabled ? 1 : 0,
            ordinal: index,
          })
          .run();
      });

      tx.delete(wheelResults).run();
      wheelData.results.forEach((result) => {
        tx.insert(wheelResults)
          .values({
            resultId: result.id,
            winner: result.winner,
            timestamp: result.timestamp,
            removedAfter: result.removedAfter ? 1 : 0,
          })
          .run();
      });
    });
  }

  ensureUser(userName: string): string {
    const existing = this.db
      .select({
        userName: wheelUsers.userName,
      })
      .from(wheelUsers)
      .where(sqlOperator`LOWER(${wheelUsers.userName}) = LOWER(${userName})`)
      .get()?.userName;

    const canonicalName = existing ?? userName;

    const maxOrdinal =
      this.db
        .select({
          maxOrdinal: sqlOperator<number>`COALESCE(MAX(${wheelUsers.ordinal}), -1)`,
        })
        .from(wheelUsers)
        .get()?.maxOrdinal ?? -1;

    this.db
      .insert(wheelUsers)
      .values({
        userName: canonicalName,
        avatar: null,
        isConnected: 0,
        ordinal: maxOrdinal + 1,
      })
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

  setWheelStatus(status: 'active' | 'completed') {
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
    const maxOrdinal =
      this.db
        .select({
          maxOrdinal: sqlOperator<number>`COALESCE(MAX(${wheelEntries.ordinal}), -1)`,
        })
        .from(wheelEntries)
        .get()?.maxOrdinal ?? -1;

    this.db
      .insert(wheelEntries)
      .values({
        entryId: entry.id,
        name: entry.name,
        enabled: entry.enabled ? 1 : 0,
        ordinal: maxOrdinal + 1,
      })
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
      })
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
    const existingTokenOwner = this.db
      .select({ userName: wheelSessionTokens.userName })
      .from(wheelSessionTokens)
      .where(
        sqlOperator`LOWER(${wheelSessionTokens.userName}) = LOWER(${canonicalName})`,
      )
      .get()?.userName;
    const tokenOwner = existingTokenOwner ?? canonicalName;

    this.db
      .insert(wheelSessionTokens)
      .values({
        userName: tokenOwner,
        token,
        createdAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: wheelSessionTokens.userName,
        set: {
          token,
          createdAt: Date.now(),
        },
      })
      .run();
  }

  validateSessionToken(userName: string, token: string | null): boolean {
    if (!token) {
      return false;
    }
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

    if (!record?.token) {
      return false;
    }

    const isExpired =
      typeof record.createdAt === 'number' &&
      Date.now() - record.createdAt > SESSION_TOKEN_TTL_MS;

    if (isExpired) {
      return false;
    }

    return record.token === token;
  }
}
