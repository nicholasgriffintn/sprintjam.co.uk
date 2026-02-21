import type { DurableObjectStorage } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import { eq } from "drizzle-orm";

import * as schema from "@sprintjam/db/durable-objects/schemas";
import {
  roomMeta,
  roomUsers,
  roomVotes,
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
import { PlanningRoomStateStore } from "./planning-room-state";
import { PlanningRoomTicketStore } from "./planning-room-tickets";

export class PlanningRoomRepository {
  private readonly db: DB;
  private readonly stateStore: PlanningRoomStateStore;
  private readonly oauthStore: PlanningRoomOAuthStore;
  private readonly ticketStore: PlanningRoomTicketStore;
  private readonly anonymousName = "Anonymous";

  constructor(storage: DurableObjectStorage, tokenCipher: TokenCipher) {
    if (!tokenCipher) {
      throw new Error("Token cipher is required");
    }
    this.db = drizzle(storage, { schema });
    this.stateStore = new PlanningRoomStateStore(this.db);
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
    return this.stateStore.ensureUser(userName);
  }

  setUserSpectatorMode(userName: string, isSpectator: boolean) {
    return this.stateStore.setUserSpectatorMode(userName, isSpectator);
  }

  setUserConnection(userName: string, isConnected: boolean) {
    return this.stateStore.setUserConnection(userName, isConnected);
  }

  setUserAvatar(userName: string, avatar?: string) {
    return this.stateStore.setUserAvatar(userName, avatar);
  }

  setModerator(userName: string) {
    return this.stateStore.setModerator(userName);
  }

  setShowVotes(showVotes: boolean) {
    return this.stateStore.setShowVotes(showVotes);
  }

  setRoomStatus(
    status: Parameters<PlanningRoomStateStore["setRoomStatus"]>[0],
  ) {
    return this.stateStore.setRoomStatus(status);
  }

  setRoundHistory(
    history: Parameters<PlanningRoomStateStore["setRoundHistory"]>[0],
  ) {
    return this.stateStore.setRoundHistory(history);
  }

  setTimerState(
    running: Parameters<PlanningRoomStateStore["setTimerState"]>[0],
    seconds: Parameters<PlanningRoomStateStore["setTimerState"]>[1],
    lastUpdateTime: Parameters<PlanningRoomStateStore["setTimerState"]>[2],
  ) {
    return this.stateStore.setTimerState(running, seconds, lastUpdateTime);
  }

  updateTimerConfig(
    config: Parameters<PlanningRoomStateStore["updateTimerConfig"]>[0],
  ) {
    return this.stateStore.updateTimerConfig(config);
  }

  startTimer(currentTime: number) {
    return this.stateStore.startTimer(currentTime);
  }

  pauseTimer(currentTime: number) {
    return this.stateStore.pauseTimer(currentTime);
  }

  resetTimer() {
    return this.stateStore.resetTimer();
  }

  setVote(userName: string, vote: string | number) {
    return this.stateStore.setVote(userName, vote);
  }

  clearVotes() {
    return this.stateStore.clearVotes();
  }

  deleteUserVote(userName: string) {
    return this.stateStore.deleteUserVote(userName);
  }

  setStructuredVote(userName: string, vote: StructuredVote) {
    return this.stateStore.setStructuredVote(userName, vote);
  }

  clearStructuredVotes() {
    return this.stateStore.clearStructuredVotes();
  }

  setJudgeState(
    score: Parameters<PlanningRoomStateStore["setJudgeState"]>[0],
    metadata?: Parameters<PlanningRoomStateStore["setJudgeState"]>[1],
  ) {
    return this.stateStore.setJudgeState(score, metadata);
  }

  setSettings(settings: RoomSettings) {
    return this.stateStore.setSettings(settings);
  }

  setPasscodeHash(passcodeHash: PasscodeHashPayload | null) {
    return this.stateStore.setPasscodeHash(passcodeHash);
  }

  getPasscodeHash() {
    return this.stateStore.getPasscodeHash();
  }

  setSessionToken(userName: string, token: string) {
    return this.stateStore.setSessionToken(userName, token);
  }

  validateSessionToken(userName: string, token: string | null) {
    return this.stateStore.validateSessionToken(userName, token);
  }

  setStrudelState(
    options: Parameters<PlanningRoomStateStore["setStrudelState"]>[0],
  ) {
    return this.stateStore.setStrudelState(options);
  }

  setStrudelPlayback(isPlaying: boolean) {
    return this.stateStore.setStrudelPlayback(isPlaying);
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
