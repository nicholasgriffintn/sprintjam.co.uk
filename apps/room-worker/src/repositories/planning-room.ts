import type { DurableObjectStorage } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import { eq, sql as sqlOperator } from "drizzle-orm";

import * as schema from "@sprintjam/db/durable-objects/schemas";
import {
  roomMeta,
  roomUsers,
  roomVotes,
  sessionTokens,
} from "@sprintjam/db/durable-objects/schemas";
import type { DB, InsertRoomMetaItem } from "@sprintjam/db";
import type {
  JudgeMetadata,
  PasscodeHashPayload,
  RoomData,
  RoomGameSession,
  RoomSettings,
  SessionRoundHistoryItem,
  StructuredVote,
} from "@sprintjam/types";
import {
  serializeJSON,
  serializeVote,
  parseJudgeScore,
  parseVote,
  safeJsonParse,
  SESSION_TOKEN_TTL_MS,
  parsePasscodeHash,
  serializePasscodeHash,
  type TokenCipher,
} from "@sprintjam/utils";
import {
  DEFAULT_TIMER_DURATION_SECONDS,
  ROOM_ROW_ID,
} from "@sprintjam/utils/constants";

import migrations from "../../drizzle/migrations";
import { PlanningRoomOAuthStore } from "./planning-room-oauth";
import { PlanningRoomTicketStore } from "./planning-room-tickets";

export class PlanningRoomRepository {
  private readonly db: DB;
  private readonly oauthStore: PlanningRoomOAuthStore;
  private readonly ticketStore: PlanningRoomTicketStore;
  private readonly anonymousName = "Anonymous";

  constructor(storage: DurableObjectStorage, tokenCipher: TokenCipher) {
    if (!tokenCipher) {
      throw new Error("Token cipher is required");
    }
    this.db = drizzle(storage, { schema });
    this.oauthStore = new PlanningRoomOAuthStore(this.db, tokenCipher);
    this.ticketStore = new PlanningRoomTicketStore(this.db, this.anonymousName);
  }

  async initializeSchema() {
    await migrate(this.db, migrations);
  }

  async getRoomData(): Promise<RoomData | undefined> {
    const row = await this.db
      .select()
      .from(roomMeta)
      .where(eq(roomMeta.id, ROOM_ROW_ID))
      .get();

    if (!row) {
      return undefined;
    }

    const users = await this.db
      .select()
      .from(roomUsers)
      .orderBy(roomUsers.ordinal)
      .all();
    const votes = await this.db.select().from(roomVotes).all();

    const connectedUsers: Record<string, boolean> = {};
    const userAvatars: Record<string, string> = {};
    const userList: string[] = [];
    const spectatorList: string[] = [];

    for (const user of users) {
      if (user.isSpectator) {
        spectatorList.push(user.userName);
      } else {
        userList.push(user.userName);
      }
      connectedUsers[user.userName] = !!user.isConnected;
      if (user.avatar) {
        userAvatars[user.userName] = user.avatar;
      }
    }

    const voteMap: Record<string, string | number> = {};
    for (const entry of votes) {
      voteMap[entry.userName] = parseVote(entry.vote);
    }

    const structuredVoteMap: Record<string, StructuredVote> = {};
    for (const entry of votes) {
      const payload = entry.structuredVotePayload;
      if (!payload) {
        continue;
      }
      try {
        const structuredVoteData = safeJsonParse<StructuredVote>(payload);
        if (!structuredVoteData) {
          throw new Error("Failed to parse structured vote from storage");
        }
        structuredVoteMap[entry.userName] = structuredVoteData;
      } catch {
        // Ignore malformed rows to avoid breaking the room load.
      }
    }

    let settings: RoomSettings;
    try {
      const settingsData = safeJsonParse<RoomSettings>(row.settings);
      if (!settingsData) {
        throw new Error("Failed to parse room settings from storage");
      }
      settings = settingsData;
    } catch {
      throw new Error("Failed to parse room settings from storage");
    }

    const anonymizeVotes =
      settings.anonymousVotes || settings.hideParticipantNames;

    const currentTicket = this.getCurrentTicket({
      anonymizeVotes,
      roomKey: row.roomKey,
    });
    const ticketQueue = this.getTicketQueue({
      anonymizeVotes,
      roomKey: row.roomKey,
    });

    const timerPausedValue =
      row.timerIsPaused === null || row.timerIsPaused === undefined
        ? 1
        : row.timerIsPaused;

    const hasTimerState =
      row.timerSeconds !== null ||
      row.timerLastUpdated !== null ||
      row.timerTargetDuration !== null ||
      row.timerRoundAnchor !== null ||
      row.timerAutoReset !== null;

    const timerState = hasTimerState
      ? {
          running:
            !!row.timerLastUpdated &&
            row.timerLastUpdated > 0 &&
            !timerPausedValue,
          seconds: row.timerSeconds ?? 0,
          lastUpdateTime: row.timerLastUpdated ?? 0,
          targetDurationSeconds:
            row.timerTargetDuration ?? DEFAULT_TIMER_DURATION_SECONDS,
          roundAnchorSeconds: row.timerRoundAnchor ?? 0,
          autoResetOnVotesReset:
            row.timerAutoReset === null || row.timerAutoReset === undefined
              ? true
              : row.timerAutoReset !== 0,
        }
      : undefined;
    const gameSession = row.gameSession
      ? safeJsonParse<RoomGameSession>(row.gameSession)
      : undefined;
    const parsedRoundHistory = row.roundHistory
      ? safeJsonParse<SessionRoundHistoryItem[]>(row.roundHistory)
      : undefined;
    const roundHistory = Array.isArray(parsedRoundHistory)
      ? parsedRoundHistory
      : undefined;

    const roomData: RoomData = {
      key: row.roomKey,
      users: userList,
      spectators: spectatorList.length > 0 ? spectatorList : undefined,
      votes: voteMap,
      structuredVotes: structuredVoteMap,
      showVotes: !!row.showVotes,
      moderator: row.moderator,
      connectedUsers,
      status: row.roomStatus === "completed" ? "completed" : "active",
      judgeScore: parseJudgeScore(row.judgeScore),
      judgeMetadata: row.judgeMetadata
        ? safeJsonParse<JudgeMetadata>(row.judgeMetadata)
        : undefined,
      settings,
      passcodeHash: parsePasscodeHash(row.passcode) ?? undefined,
      userAvatars:
        Object.keys(userAvatars).length > 0 ? userAvatars : undefined,
      currentStrudelCode: row.currentStrudelCode ?? undefined,
      currentStrudelGenerationId: row.currentStrudelGenerationId ?? undefined,
      strudelPhase: row.strudelPhase ?? undefined,
      strudelIsPlaying: row.strudelIsPlaying
        ? !!row.strudelIsPlaying
        : undefined,
      currentTicket,
      ticketQueue: ticketQueue.length > 0 ? ticketQueue : undefined,
      roundHistory: roundHistory?.length ? roundHistory : undefined,
      timerState,
      gameSession,
    };

    return roomData;
  }

  async replaceRoomData(roomData: RoomData): Promise<void> {
    await this.db.transaction((tx) => {
      const metaValues: InsertRoomMetaItem = {
        id: ROOM_ROW_ID,
        roomKey: roomData.key,
        moderator: roomData.moderator,
        showVotes: roomData.showVotes ? 1 : 0,
        roomStatus: roomData.status ?? "active",
        passcode: serializePasscodeHash(roomData.passcodeHash),
        judgeScore:
          roomData.judgeScore === undefined || roomData.judgeScore === null
            ? null
            : String(roomData.judgeScore),
        judgeMetadata: serializeJSON(roomData.judgeMetadata),
        settings: JSON.stringify(roomData.settings),
        currentStrudelCode: roomData.currentStrudelCode ?? null,
        currentStrudelGenerationId: roomData.currentStrudelGenerationId ?? null,
        strudelPhase: roomData.strudelPhase ?? null,
        strudelIsPlaying: roomData.strudelIsPlaying ? 1 : 0,
        roundHistory: serializeJSON(roomData.roundHistory),
        timerSeconds: roomData.timerState?.seconds ?? null,
        timerLastUpdated: roomData.timerState?.lastUpdateTime ?? null,
        timerIsPaused: roomData.timerState?.running ? 1 : 0,
        timerTargetDuration:
          roomData.timerState?.targetDurationSeconds ??
          DEFAULT_TIMER_DURATION_SECONDS,
        timerRoundAnchor: roomData.timerState?.roundAnchorSeconds ?? 0,
        timerAutoReset:
          roomData.timerState?.autoResetOnVotesReset === false ? 0 : 1,
        gameSession: serializeJSON(roomData.gameSession),
      };

      tx.insert(roomMeta)
        .values(metaValues)
        .onConflictDoUpdate({
          target: roomMeta.id,
          set: metaValues,
        })
        .run();

      tx.delete(roomUsers).run();
      roomData.users.forEach((user, index) => {
        tx.insert(roomUsers)
          .values({
            userName: user,
            avatar: roomData.userAvatars?.[user] ?? null,
            isConnected: roomData.connectedUsers?.[user] ? 1 : 0,
            isSpectator: 0,
            ordinal: index,
          })
          .run();
      });

      const spectatorStartIndex = roomData.users.length;
      roomData.spectators?.forEach((user, index) => {
        tx.insert(roomUsers)
          .values({
            userName: user,
            avatar: roomData.userAvatars?.[user] ?? null,
            isConnected: roomData.connectedUsers?.[user] ? 1 : 0,
            isSpectator: 1,
            ordinal: spectatorStartIndex + index,
          })
          .run();
      });

      tx.delete(roomVotes).run();
      Object.entries(roomData.votes).forEach(([user, vote]) => {
        const structuredVote = roomData.structuredVotes?.[user] ?? null;
        tx.insert(roomVotes)
          .values({
            userName: user,
            vote: serializeVote(vote),
            structuredVotePayload: structuredVote
              ? JSON.stringify(structuredVote)
              : null,
          })
          .run();
      });
    });
  }

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

  getCurrentTicket(
    options?: Parameters<PlanningRoomTicketStore["getCurrentTicket"]>[0],
  ) {
    return this.ticketStore.getCurrentTicket(options);
  }

  getTicketById(
    id: number,
    options?: Parameters<PlanningRoomTicketStore["getTicketById"]>[1],
  ) {
    return this.ticketStore.getTicketById(id, options);
  }

  getTicketQueue(
    options?: Parameters<PlanningRoomTicketStore["getTicketQueue"]>[0],
  ) {
    return this.ticketStore.getTicketQueue(options);
  }

  getTicketVotes(
    ticketQueueId: number,
    anonymizeVotes?: Parameters<PlanningRoomTicketStore["getTicketVotes"]>[1],
  ) {
    return this.ticketStore.getTicketVotes(ticketQueueId, anonymizeVotes);
  }

  createTicket(ticket: Parameters<PlanningRoomTicketStore["createTicket"]>[0]) {
    return this.ticketStore.createTicket(ticket);
  }

  updateTicket(
    id: number,
    updates: Parameters<PlanningRoomTicketStore["updateTicket"]>[1],
  ) {
    return this.ticketStore.updateTicket(id, updates);
  }

  deleteTicket(id: number): void {
    this.ticketStore.deleteTicket(id);
  }

  setCurrentTicket(
    ticketId: Parameters<PlanningRoomTicketStore["setCurrentTicket"]>[0],
  ): void {
    this.ticketStore.setCurrentTicket(ticketId);
  }

  getTicketByTicketKey(
    ticketKey: string,
    options?: Parameters<PlanningRoomTicketStore["getTicketByTicketKey"]>[1],
  ) {
    return this.ticketStore.getTicketByTicketKey(ticketKey, options);
  }

  logTicketVote(
    ticketQueueId: number,
    userName: string,
    vote: Parameters<PlanningRoomTicketStore["logTicketVote"]>[2],
    structuredVote?: Parameters<PlanningRoomTicketStore["logTicketVote"]>[3],
  ): void {
    this.ticketStore.logTicketVote(
      ticketQueueId,
      userName,
      vote,
      structuredVote,
    );
  }

  getNextTicketId(
    args: Parameters<PlanningRoomTicketStore["getNextTicketId"]>[0],
  ): string {
    return this.ticketStore.getNextTicketId(args);
  }

  reorderQueue(ticketIds: number[]): void {
    this.ticketStore.reorderQueue(ticketIds);
  }

  async getJiraOAuthCredentials(roomKey: string) {
    return this.oauthStore.getJiraOAuthCredentials(roomKey);
  }

  async saveJiraOAuthCredentials(
    credentials: Parameters<
      PlanningRoomOAuthStore["saveJiraOAuthCredentials"]
    >[0],
  ) {
    return this.oauthStore.saveJiraOAuthCredentials(credentials);
  }

  async updateJiraOAuthTokens(
    roomKey: string,
    accessToken: string,
    refreshToken: string | null,
    expiresAt: number,
  ) {
    return this.oauthStore.updateJiraOAuthTokens(
      roomKey,
      accessToken,
      refreshToken,
      expiresAt,
    );
  }

  deleteJiraOAuthCredentials(roomKey: string): void {
    this.oauthStore.deleteJiraOAuthCredentials(roomKey);
  }

  async getLinearOAuthCredentials(roomKey: string) {
    return this.oauthStore.getLinearOAuthCredentials(roomKey);
  }

  async saveLinearOAuthCredentials(
    credentials: Parameters<
      PlanningRoomOAuthStore["saveLinearOAuthCredentials"]
    >[0],
  ) {
    return this.oauthStore.saveLinearOAuthCredentials(credentials);
  }

  async updateLinearOAuthTokens(
    roomKey: string,
    accessToken: string,
    refreshToken: string | null,
    expiresAt: number,
  ) {
    return this.oauthStore.updateLinearOAuthTokens(
      roomKey,
      accessToken,
      refreshToken,
      expiresAt,
    );
  }

  deleteLinearOAuthCredentials(roomKey: string): void {
    this.oauthStore.deleteLinearOAuthCredentials(roomKey);
  }

  async updateLinearEstimateField(
    roomKey: string,
    estimateField: string | null,
  ) {
    return this.oauthStore.updateLinearEstimateField(roomKey, estimateField);
  }

  async getGithubOAuthCredentials(roomKey: string) {
    return this.oauthStore.getGithubOAuthCredentials(roomKey);
  }

  async saveGithubOAuthCredentials(
    credentials: Parameters<
      PlanningRoomOAuthStore["saveGithubOAuthCredentials"]
    >[0],
  ) {
    return this.oauthStore.saveGithubOAuthCredentials(credentials);
  }

  deleteGithubOAuthCredentials(roomKey: string): void {
    this.oauthStore.deleteGithubOAuthCredentials(roomKey);
  }
}
