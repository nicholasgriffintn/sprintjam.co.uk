import { eq, sql as sqlOperator } from "drizzle-orm";

import {
  roomMeta,
  roomUsers,
  roomVotes,
  sessionTokens,
} from "@sprintjam/db/durable-objects/schemas";
import type { DB } from "@sprintjam/db";
import type {
  JudgeMetadata,
  PasscodeHashPayload,
  RoomSettings,
  SessionRoundHistoryItem,
  StructuredVote,
} from "@sprintjam/types";
import {
  SESSION_TOKEN_TTL_MS,
  parsePasscodeHash,
  serializeJSON,
  serializePasscodeHash,
  serializeVote,
} from "@sprintjam/utils";
import { ROOM_ROW_ID } from "@sprintjam/utils/constants";

export class PlanningRoomStateStore {
  constructor(private readonly db: DB) {}

  ensureUser(userName: string): string {
    const existing = this.db
      .select({
        userName: roomUsers.userName,
      })
      .from(roomUsers)
      .where(sqlOperator`LOWER(${roomUsers.userName}) = LOWER(${userName})`)
      .get()?.userName;

    const canonicalName = existing ?? userName;

    const maxOrdinal =
      this.db
        .select({
          maxOrdinal: sqlOperator<number>`COALESCE(MAX(${roomUsers.ordinal}), -1)`,
        })
        .from(roomUsers)
        .get()?.maxOrdinal ?? -1;

    this.db
      .insert(roomUsers)
      .values({
        userName: canonicalName,
        avatar: null,
        isConnected: 0,
        isSpectator: 0,
        ordinal: maxOrdinal + 1,
      })
      .onConflictDoNothing()
      .run();

    return canonicalName;
  }

  setUserSpectatorMode(userName: string, isSpectator: boolean) {
    const canonicalName = this.ensureUser(userName);
    this.db
      .update(roomUsers)
      .set({ isSpectator: isSpectator ? 1 : 0 })
      .where(eq(roomUsers.userName, canonicalName))
      .run();
  }

  setUserConnection(userName: string, isConnected: boolean) {
    const canonicalName = this.ensureUser(userName);
    this.db
      .update(roomUsers)
      .set({ isConnected: isConnected ? 1 : 0 })
      .where(eq(roomUsers.userName, canonicalName))
      .run();
  }

  setUserAvatar(userName: string, avatar?: string) {
    if (!avatar) {
      return;
    }
    const canonicalName = this.ensureUser(userName);
    this.db
      .update(roomUsers)
      .set({ avatar })
      .where(eq(roomUsers.userName, canonicalName))
      .run();
  }

  setModerator(userName: string) {
    this.db
      .update(roomMeta)
      .set({ moderator: userName })
      .where(eq(roomMeta.id, ROOM_ROW_ID))
      .run();
  }

  setShowVotes(showVotes: boolean) {
    this.db
      .update(roomMeta)
      .set({ showVotes: showVotes ? 1 : 0 })
      .where(eq(roomMeta.id, ROOM_ROW_ID))
      .run();
  }

  setRoomStatus(status: "active" | "completed") {
    this.db
      .update(roomMeta)
      .set({ roomStatus: status })
      .where(eq(roomMeta.id, ROOM_ROW_ID))
      .run();
  }

  setRoundHistory(history: SessionRoundHistoryItem[]) {
    this.db
      .update(roomMeta)
      .set({ roundHistory: serializeJSON(history) })
      .where(eq(roomMeta.id, ROOM_ROW_ID))
      .run();
  }

  setTimerState(running: boolean, seconds: number, lastUpdateTime: number) {
    this.db
      .update(roomMeta)
      .set({
        timerIsPaused: running ? 1 : 0,
        timerSeconds: seconds,
        timerLastUpdated: lastUpdateTime,
      })
      .where(eq(roomMeta.id, ROOM_ROW_ID))
      .run();
  }

  updateTimerConfig(config: {
    targetDurationSeconds?: number;
    roundAnchorSeconds?: number;
    autoResetOnVotesReset?: boolean;
  }) {
    const params: Partial<typeof roomMeta.$inferInsert> = {};

    if (config.targetDurationSeconds !== undefined) {
      params.timerTargetDuration = config.targetDurationSeconds;
    }
    if (config.roundAnchorSeconds !== undefined) {
      params.timerRoundAnchor = config.roundAnchorSeconds;
    }
    if (config.autoResetOnVotesReset !== undefined) {
      params.timerAutoReset = config.autoResetOnVotesReset ? 1 : 0;
    }

    if (Object.keys(params).length === 0) {
      return;
    }

    this.db
      .update(roomMeta)
      .set(params)
      .where(eq(roomMeta.id, ROOM_ROW_ID))
      .run();
  }

  startTimer(currentTime: number) {
    this.db
      .update(roomMeta)
      .set({ timerIsPaused: 0, timerLastUpdated: currentTime })
      .where(eq(roomMeta.id, ROOM_ROW_ID))
      .run();
  }

  pauseTimer(currentTime: number) {
    const row = this.db
      .select({
        timerIsPaused: roomMeta.timerIsPaused,
        timerSeconds: roomMeta.timerSeconds,
        timerLastUpdated: roomMeta.timerLastUpdated,
      })
      .from(roomMeta)
      .where(eq(roomMeta.id, ROOM_ROW_ID))
      .get();

    if (row && !row.timerIsPaused) {
      const elapsedSinceLastUpdate = Math.floor(
        (currentTime - (row.timerLastUpdated ?? 0)) / 1000,
      );
      const existingSeconds = row.timerSeconds ?? 0;
      const newSeconds = existingSeconds + elapsedSinceLastUpdate;
      this.db
        .update(roomMeta)
        .set({
          timerIsPaused: 1,
          timerSeconds: newSeconds,
          timerLastUpdated: currentTime,
        })
        .where(eq(roomMeta.id, ROOM_ROW_ID))
        .run();
    }
  }

  resetTimer() {
    this.db
      .update(roomMeta)
      .set({
        timerIsPaused: 0,
        timerSeconds: 0,
        timerLastUpdated: 0,
        timerRoundAnchor: 0,
      })
      .where(eq(roomMeta.id, ROOM_ROW_ID))
      .run();
  }

  setVote(userName: string, vote: string | number) {
    const canonicalName = this.ensureUser(userName);
    this.db
      .insert(roomVotes)
      .values({
        userName: canonicalName,
        vote: serializeVote(vote),
        structuredVotePayload: null,
      })
      .onConflictDoUpdate({
        target: roomVotes.userName,
        set: {
          vote: serializeVote(vote),
          structuredVotePayload: null,
        },
      })
      .run();
  }

  clearVotes() {
    this.db.delete(roomVotes).run();
  }

  deleteUserVote(userName: string) {
    this.db.delete(roomVotes).where(eq(roomVotes.userName, userName)).run();
  }

  setStructuredVote(userName: string, vote: StructuredVote) {
    const canonicalName = this.ensureUser(userName);
    this.db
      .update(roomVotes)
      .set({ structuredVotePayload: JSON.stringify(vote) })
      .where(eq(roomVotes.userName, canonicalName))
      .run();
  }

  clearStructuredVotes() {
    this.db.update(roomVotes).set({ structuredVotePayload: null }).run();
  }

  setJudgeState(score: string | number | null, metadata?: JudgeMetadata) {
    this.db
      .update(roomMeta)
      .set({
        judgeScore:
          score === null || score === undefined ? null : String(score),
        judgeMetadata: serializeJSON(metadata),
      })
      .where(eq(roomMeta.id, ROOM_ROW_ID))
      .run();
  }

  setSettings(settings: RoomSettings) {
    this.db
      .update(roomMeta)
      .set({ settings: JSON.stringify(settings) })
      .where(eq(roomMeta.id, ROOM_ROW_ID))
      .run();
  }

  setPasscodeHash(passcodeHash: PasscodeHashPayload | null) {
    this.db
      .update(roomMeta)
      .set({ passcode: serializePasscodeHash(passcodeHash) })
      .where(eq(roomMeta.id, ROOM_ROW_ID))
      .run();
  }

  getPasscodeHash(): PasscodeHashPayload | null {
    const result = this.db
      .select({ passcode: roomMeta.passcode })
      .from(roomMeta)
      .where(eq(roomMeta.id, ROOM_ROW_ID))
      .get();

    return parsePasscodeHash(result?.passcode ?? null);
  }

  setSessionToken(userName: string, token: string) {
    const canonicalName = this.ensureUser(userName);
    const existingTokenOwner = this.db
      .select({ userName: sessionTokens.userName })
      .from(sessionTokens)
      .where(
        sqlOperator`LOWER(${sessionTokens.userName}) = LOWER(${canonicalName})`,
      )
      .get()?.userName;
    const tokenOwner = existingTokenOwner ?? canonicalName;

    this.db
      .insert(sessionTokens)
      .values({
        userName: tokenOwner,
        token,
        createdAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: sessionTokens.userName,
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
        token: sessionTokens.token,
        createdAt: sessionTokens.createdAt,
      })
      .from(sessionTokens)
      .where(sqlOperator`LOWER(${sessionTokens.userName}) = LOWER(${userName})`)
      .get();

    if (!record?.token) {
      return false;
    }

    const isExpired =
      typeof record.createdAt === "number" &&
      Date.now() - record.createdAt > SESSION_TOKEN_TTL_MS;

    if (isExpired) {
      return false;
    }

    return record.token === token;
  }

  setStrudelState(options: {
    code?: string;
    generationId?: string;
    phase?: string;
  }) {
    this.db
      .update(roomMeta)
      .set({
        currentStrudelCode: options.code ?? null,
        currentStrudelGenerationId: options.generationId ?? null,
        strudelPhase: options.phase ?? null,
      })
      .where(eq(roomMeta.id, ROOM_ROW_ID))
      .run();
  }

  setStrudelPlayback(isPlaying: boolean) {
    this.db
      .update(roomMeta)
      .set({ strudelIsPlaying: isPlaying ? 1 : 0 })
      .where(eq(roomMeta.id, ROOM_ROW_ID))
      .run();
  }
}
