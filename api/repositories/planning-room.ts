import type { DurableObjectStorage } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/durable-sqlite';
import { migrate } from 'drizzle-orm/durable-sqlite/migrator';
import { eq, and, desc, like, sql as sqlOperator } from 'drizzle-orm';

import migrations from '../drizzle/migrations';
import * as schema from '../db/schemas';
import {
  roomMeta,
  roomUsers,
  roomVotes,
  sessionTokens,
  ticketQueue,
  ticketVotes,
  oauthCredentials,
} from '../db/schemas';
import type {
  DB,
  InsertRoomMetaItem,
  TicketCreateInput,
  TicketQueueItem,
} from '../db/types';
import type { TicketQueueWithVotes } from '../types';
import type {
  JudgeMetadata,
  PasscodeHashPayload,
  RoomData,
  RoomSettings,
  StructuredVote,
  TicketVote,
  VoteValue,
} from '../types';
import { serializeJSON, serializeVote } from '../utils/serialize';
import { parseJudgeScore, parseVote, safeJsonParse } from '../utils/parse';
import { DEFAULT_TIMER_DURATION_SECONDS, ROOM_ROW_ID } from '../constants';
import {
  SESSION_TOKEN_TTL_MS,
  parsePasscodeHash,
  serializePasscodeHash,
} from '../utils/room-cypto';
import { TokenCipher } from '../utils/token-crypto';

export class PlanningRoomRepository {
  private readonly db: DB;
  private readonly anonymousName = 'Anonymous';

  constructor(
    storage: DurableObjectStorage,
    private readonly tokenCipher: TokenCipher
  ) {
    if (!tokenCipher) {
      throw new Error('Token cipher is required');
    }
    this.db = drizzle(storage, { schema });
  }

  private async encryptToken(
    value: string | null | undefined
  ): Promise<string | null> {
    if (value === null || value === undefined) {
      return null;
    }
    return this.tokenCipher.encrypt(value);
  }

  private async decryptToken(
    value: string | null | undefined
  ): Promise<string | null> {
    if (value === null || value === undefined) {
      return null;
    }
    return this.tokenCipher.decrypt(value);
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

    for (const user of users) {
      userList.push(user.userName);
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
          throw new Error('Failed to parse structured vote from storage');
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
        throw new Error('Failed to parse room settings from storage');
      }
      settings = settingsData;
    } catch {
      throw new Error('Failed to parse room settings from storage');
    }

    const anonymizeVotes =
      settings.anonymousVotes || settings.hideParticipantNames;

    const currentTicket = this.getCurrentTicket({
      anonymizeVotes,
    });
    const ticketQueue = this.getTicketQueue({
      anonymizeVotes,
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

    const roomData: RoomData = {
      key: row.roomKey,
      users: userList,
      votes: voteMap,
      structuredVotes: structuredVoteMap,
      showVotes: !!row.showVotes,
      moderator: row.moderator,
      connectedUsers,
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
      timerState,
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
        timerSeconds: roomData.timerState?.seconds ?? null,
        timerLastUpdated: roomData.timerState?.lastUpdateTime ?? null,
        timerIsPaused: roomData.timerState?.running ? 1 : 0,
        timerTargetDuration:
          roomData.timerState?.targetDurationSeconds ??
          DEFAULT_TIMER_DURATION_SECONDS,
        timerRoundAnchor: roomData.timerState?.roundAnchorSeconds ?? 0,
        timerAutoReset:
          roomData.timerState?.autoResetOnVotesReset === false ? 0 : 1,
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
            ordinal: index,
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
        ordinal: maxOrdinal + 1,
      })
      .onConflictDoNothing()
      .run();

    return canonicalName;
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
        (currentTime - (row.timerLastUpdated ?? 0)) / 1000
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
        sqlOperator`LOWER(${sessionTokens.userName}) = LOWER(${canonicalName})`
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
      typeof record.createdAt === 'number' &&
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

  getCurrentTicket(options?: {
    anonymizeVotes?: boolean;
  }): TicketQueueItem | undefined {
    const currentTicketId = this.db
      .select({ currentTicketId: roomMeta.currentTicketId })
      .from(roomMeta)
      .where(eq(roomMeta.id, ROOM_ROW_ID))
      .get()?.currentTicketId;

    if (!currentTicketId) {
      return undefined;
    }

    return this.getTicketById(currentTicketId, options);
  }

  getTicketById(
    id: number,
    options?: { anonymizeVotes?: boolean }
  ): TicketQueueWithVotes | undefined {
    const row = this.db
      .select()
      .from(ticketQueue)
      .where(eq(ticketQueue.id, id))
      .get();

    if (!row) {
      return undefined;
    }

    const votes = this.getTicketVotes(row.id, options?.anonymizeVotes);

    return {
      id: row.id,
      ticketId: row.ticketId,
      title: row.title ?? null,
      description: row.description ?? null,
      status: row.status,
      outcome: row.outcome ?? null,
      createdAt: row.createdAt,
      completedAt: row.completedAt ?? null,
      ordinal: row.ordinal,
      externalService: row.externalService ?? 'none',
      externalServiceId: row.externalServiceId ?? null,
      externalServiceMetadata: row.externalServiceMetadata
        ? safeJsonParse<Record<string, unknown>>(row.externalServiceMetadata)
        : null,
      votes,
    } as unknown as TicketQueueItem;
  }

  getTicketQueue(options?: {
    anonymizeVotes?: boolean;
  }): TicketQueueWithVotes[] {
    const rows = this.db
      .select()
      .from(ticketQueue)
      .orderBy(ticketQueue.ordinal)
      .all();

    return rows.map((row) => {
      const votes = this.getTicketVotes(row.id, options?.anonymizeVotes);

      return {
        id: row.id,
        ticketId: row.ticketId,
        title: row.title ?? null,
        description: row.description ?? null,
        status: row.status,
        outcome: row.outcome ?? null,
        createdAt: row.createdAt,
        completedAt: row.completedAt ?? null,
        ordinal: row.ordinal,
        externalService: row.externalService ?? 'none',
        externalServiceId: row.externalServiceId ?? null,
        externalServiceMetadata: row.externalServiceMetadata
          ? safeJsonParse<Record<string, unknown>>(row.externalServiceMetadata)
          : null,
        votes,
      } as unknown as TicketQueueItem;
    });
  }

  getTicketVotes(
    ticketQueueId: number,
    anonymizeVotes?: boolean
  ): TicketVote[] {
    const rows = this.db
      .select()
      .from(ticketVotes)
      .where(eq(ticketVotes.ticketQueueId, ticketQueueId))
      .orderBy(ticketVotes.votedAt)
      .all();

    return rows.map((row) => {
      const structuredVotePayload = row.structuredVotePayload
        ? safeJsonParse<StructuredVote>(row.structuredVotePayload)
        : undefined;

      return {
        id: row.id,
        ticketQueueId: row.ticketQueueId,
        userName: anonymizeVotes ? this.anonymousName : row.userName,
        vote: parseVote(row.vote),
        structuredVotePayload,
        votedAt: row.votedAt,
      };
    });
  }

  createTicket(ticket: TicketCreateInput): TicketQueueWithVotes {
    const [inserted] = this.db
      .insert(ticketQueue)
      .values({
        ticketId: ticket.ticketId,
        title: ticket.title ?? null,
        description: ticket.description ?? null,
        status: ticket.status,
        outcome: ticket.outcome ?? null,
        createdAt: Date.now(),
        completedAt: ticket.completedAt ?? null,
        ordinal: ticket.ordinal,
        externalService: ticket.externalService ?? 'none',
        externalServiceId: ticket.externalServiceId ?? null,
        externalServiceMetadata: serializeJSON(
          ticket.externalServiceMetadata ?? null
        ),
      })
      .returning({ id: ticketQueue.id })
      .all();

    if (!inserted) {
      throw new Error('Failed to create ticket');
    }

    const created = this.getTicketById(inserted.id);
    if (!created) {
      throw new Error('Failed to create ticket');
    }
    return created;
  }

  updateTicket(
    id: number,
    updates: Partial<Omit<TicketQueueWithVotes, 'id' | 'createdAt' | 'votes'>>
  ): void {
    const payload: Partial<typeof ticketQueue.$inferInsert> = {};

    if (updates.ticketId !== undefined) {
      payload.ticketId = updates.ticketId;
    }
    if (updates.title !== undefined) {
      payload.title = updates.title ?? null;
    }
    if (updates.description !== undefined) {
      payload.description = updates.description ?? null;
    }
    if (updates.status !== undefined) {
      payload.status = updates.status;
    }
    if (updates.outcome !== undefined) {
      payload.outcome = updates.outcome ?? null;
    }
    if (updates.completedAt !== undefined) {
      payload.completedAt = updates.completedAt ?? null;
    }
    if (updates.ordinal !== undefined) {
      payload.ordinal = updates.ordinal;
    }
    if (updates.externalService !== undefined) {
      payload.externalService = updates.externalService;
    }
    if (updates.externalServiceId !== undefined) {
      payload.externalServiceId = updates.externalServiceId ?? null;
    }
    if (updates.externalServiceMetadata !== undefined) {
      payload.externalServiceMetadata = serializeJSON(
        updates.externalServiceMetadata
      );
    }

    if (Object.keys(payload).length === 0) {
      return;
    }

    this.db
      .update(ticketQueue)
      .set(payload)
      .where(eq(ticketQueue.id, id))
      .run();
  }

  deleteTicket(id: number): void {
    this.db.delete(ticketQueue).where(eq(ticketQueue.id, id)).run();
  }

  setCurrentTicket(ticketId: number | null): void {
    this.db
      .update(roomMeta)
      .set({ currentTicketId: ticketId })
      .where(eq(roomMeta.id, ROOM_ROW_ID))
      .run();
  }

  getTicketByTicketKey(
    ticketKey: string,
    options?: { anonymizeVotes?: boolean }
  ): TicketQueueWithVotes | undefined {
    const row = this.db
      .select({ id: ticketQueue.id })
      .from(ticketQueue)
      .where(eq(ticketQueue.ticketId, ticketKey))
      .limit(1)
      .get();

    if (!row) return undefined;
    return this.getTicketById(row.id, options);
  }

  logTicketVote(
    ticketQueueId: number,
    userName: string,
    vote: VoteValue,
    structuredVote?: StructuredVote
  ): void {
    this.db
      .insert(ticketVotes)
      .values({
        ticketQueueId,
        userName,
        vote: serializeVote(vote),
        structuredVotePayload: structuredVote
          ? JSON.stringify(structuredVote)
          : null,
        votedAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: [ticketVotes.ticketQueueId, ticketVotes.userName],
        set: {
          vote: serializeVote(vote),
          structuredVotePayload: structuredVote
            ? JSON.stringify(structuredVote)
            : null,
          votedAt: Date.now(),
        },
      })
      .run();
  }

  getNextTicketId({ externalService = 'none' }): string {
    const maxTicket = this.db
      .select({ ticketId: ticketQueue.ticketId })
      .from(ticketQueue)
      .where(like(ticketQueue.ticketId, 'SPRINTJAM-%'))
      .orderBy(
        desc(sqlOperator`CAST(SUBSTR(${ticketQueue.ticketId}, 11) AS INTEGER)`)
      )
      .limit(1)
      .get();

    if (!maxTicket && externalService === 'none') {
      return 'SPRINTJAM-001';
    } else if (!maxTicket) {
      return '';
    }

    const ticketKey =
      typeof maxTicket.ticketId === 'string'
        ? maxTicket.ticketId
        : String(maxTicket.ticketId ?? '');

    const match = ticketKey.match(/SPRINTJAM-(\d+)/);
    if (!match && externalService === 'none') {
      return 'SPRINTJAM-001';
    } else if (!match) {
      return '';
    }

    const nextNum = parseInt(match[1], 10) + 1;
    return `SPRINTJAM-${String(nextNum).padStart(3, '0')}`;
  }

  reorderQueue(ticketIds: number[]): void {
    ticketIds.forEach((id, index) => {
      this.db
        .update(ticketQueue)
        .set({ ordinal: index })
        .where(eq(ticketQueue.id, id))
        .run();
    });
  }

  async getJiraOAuthCredentials(roomKey: string): Promise<{
    id: number;
    roomKey: string;
    accessToken: string;
    refreshToken: string | null;
    tokenType: string;
    expiresAt: number;
    scope: string | null;
    jiraDomain: string;
    jiraCloudId: string | null;
    jiraUserId: string | null;
    jiraUserEmail: string | null;
    storyPointsField: string | null;
    sprintField: string | null;
    authorizedBy: string;
    createdAt: number;
    updatedAt: number;
  } | null> {
    const row = this.db
      .select()
      .from(oauthCredentials)
      .where(
        and(
          eq(oauthCredentials.roomKey, roomKey),
          eq(oauthCredentials.provider, 'jira')
        )
      )
      .get();

    if (!row) return null;

    const metadata = safeJsonParse<{
      jiraDomain?: string;
      jiraCloudId?: string | null;
      jiraUserId?: string | null;
      jiraUserEmail?: string | null;
      storyPointsField?: string | null;
      sprintField?: string | null;
    }>(row.metadata ?? '{}');

    const accessToken = await this.tokenCipher.decrypt(row.accessToken);
    const refreshToken = await this.decryptToken(row.refreshToken);

    return {
      id: row.id,
      roomKey: row.roomKey,
      accessToken,
      refreshToken,
      tokenType: row.tokenType,
      expiresAt: row.expiresAt,
      scope: row.scope,
      jiraDomain: metadata?.jiraDomain ?? '',
      jiraCloudId: metadata?.jiraCloudId ?? null,
      jiraUserId: metadata?.jiraUserId ?? null,
      jiraUserEmail: metadata?.jiraUserEmail ?? null,
      storyPointsField: metadata?.storyPointsField ?? null,
      sprintField: metadata?.sprintField ?? null,
      authorizedBy: row.authorizedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async saveJiraOAuthCredentials(credentials: {
    roomKey: string;
    accessToken: string;
    refreshToken: string | null;
    tokenType: string;
    expiresAt: number;
    scope: string | null;
    jiraDomain: string;
    jiraCloudId: string | null;
    jiraUserId: string | null;
    jiraUserEmail: string | null;
    storyPointsField: string | null;
    sprintField: string | null;
    authorizedBy: string;
  }): Promise<void> {
    const now = Date.now();
    const metadata = JSON.stringify({
      jiraDomain: credentials.jiraDomain,
      jiraCloudId: credentials.jiraCloudId,
      jiraUserId: credentials.jiraUserId,
      jiraUserEmail: credentials.jiraUserEmail,
      storyPointsField: credentials.storyPointsField,
      sprintField: credentials.sprintField,
    });
    const encryptedAccessToken = await this.tokenCipher.encrypt(
      credentials.accessToken
    );
    const encryptedRefreshToken = await this.encryptToken(
      credentials.refreshToken
    );

    this.db
      .insert(oauthCredentials)
      .values({
        roomKey: credentials.roomKey,
        provider: 'jira',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenType: credentials.tokenType,
        expiresAt: credentials.expiresAt,
        scope: credentials.scope,
        authorizedBy: credentials.authorizedBy,
        metadata,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [oauthCredentials.roomKey, oauthCredentials.provider],
        set: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenType: credentials.tokenType,
          expiresAt: credentials.expiresAt,
          scope: credentials.scope,
          authorizedBy: credentials.authorizedBy,
          metadata,
          updatedAt: now,
        },
      })
      .run();
  }

  async updateJiraOAuthTokens(
    roomKey: string,
    accessToken: string,
    refreshToken: string | null,
    expiresAt: number
  ): Promise<void> {
    const encryptedAccessToken = await this.tokenCipher.encrypt(accessToken);
    const encryptedRefreshToken = await this.encryptToken(refreshToken);
    this.db
      .update(oauthCredentials)
      .set({
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        updatedAt: Date.now(),
      })
      .where(
        and(
          eq(oauthCredentials.roomKey, roomKey),
          eq(oauthCredentials.provider, 'jira')
        )
      )
      .run();
  }

  deleteJiraOAuthCredentials(roomKey: string): void {
    this.db
      .delete(oauthCredentials)
      .where(
        and(
          eq(oauthCredentials.roomKey, roomKey),
          eq(oauthCredentials.provider, 'jira')
        )
      )
      .run();
  }

  async getLinearOAuthCredentials(roomKey: string): Promise<{
    id: number;
    roomKey: string;
    accessToken: string;
    refreshToken: string | null;
    tokenType: string;
    expiresAt: number;
    scope: string | null;
    linearOrganizationId: string | null;
    linearUserId: string | null;
    linearUserEmail: string | null;
    estimateField: string | null;
    authorizedBy: string;
    createdAt: number;
    updatedAt: number;
  } | null> {
    const row = this.db
      .select()
      .from(oauthCredentials)
      .where(
        and(
          eq(oauthCredentials.roomKey, roomKey),
          eq(oauthCredentials.provider, 'linear')
        )
      )
      .get();

    if (!row) return null;

    const metadata = safeJsonParse<{
      linearOrganizationId?: string | null;
      linearUserId?: string | null;
      linearUserEmail?: string | null;
      estimateField?: string | null;
    }>(row.metadata ?? '{}');

    const accessToken = await this.tokenCipher.decrypt(row.accessToken);
    const refreshToken = await this.decryptToken(row.refreshToken);

    return {
      id: row.id,
      roomKey: row.roomKey,
      accessToken,
      refreshToken,
      tokenType: row.tokenType,
      expiresAt: row.expiresAt,
      scope: row.scope,
      linearOrganizationId: metadata?.linearOrganizationId ?? null,
      linearUserId: metadata?.linearUserId ?? null,
      linearUserEmail: metadata?.linearUserEmail ?? null,
      estimateField: metadata?.estimateField ?? null,
      authorizedBy: row.authorizedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async saveLinearOAuthCredentials(credentials: {
    roomKey: string;
    accessToken: string;
    refreshToken: string | null;
    tokenType: string;
    expiresAt: number;
    scope: string | null;
    linearOrganizationId: string | null;
    linearUserId: string | null;
    linearUserEmail: string | null;
    estimateField: string | null;
    authorizedBy: string;
  }): Promise<void> {
    const now = Date.now();
    const metadata = JSON.stringify({
      linearOrganizationId: credentials.linearOrganizationId,
      linearUserId: credentials.linearUserId,
      linearUserEmail: credentials.linearUserEmail,
      estimateField: credentials.estimateField,
    });
    const encryptedAccessToken = await this.tokenCipher.encrypt(
      credentials.accessToken
    );
    const encryptedRefreshToken = await this.encryptToken(
      credentials.refreshToken
    );

    this.db
      .insert(oauthCredentials)
      .values({
        roomKey: credentials.roomKey,
        provider: 'linear',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenType: credentials.tokenType,
        expiresAt: credentials.expiresAt,
        scope: credentials.scope,
        authorizedBy: credentials.authorizedBy,
        metadata,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [oauthCredentials.roomKey, oauthCredentials.provider],
        set: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenType: credentials.tokenType,
          expiresAt: credentials.expiresAt,
          scope: credentials.scope,
          authorizedBy: credentials.authorizedBy,
          metadata,
          updatedAt: now,
        },
      })
      .run();
  }

  async updateLinearOAuthTokens(
    roomKey: string,
    accessToken: string,
    refreshToken: string | null,
    expiresAt: number
  ): Promise<void> {
    const encryptedAccessToken = await this.tokenCipher.encrypt(accessToken);
    const encryptedRefreshToken = await this.encryptToken(refreshToken);
    this.db
      .update(oauthCredentials)
      .set({
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        updatedAt: Date.now(),
      })
      .where(
        and(
          eq(oauthCredentials.roomKey, roomKey),
          eq(oauthCredentials.provider, 'linear')
        )
      )
      .run();
  }

  deleteLinearOAuthCredentials(roomKey: string): void {
    this.db
      .delete(oauthCredentials)
      .where(
        and(
          eq(oauthCredentials.roomKey, roomKey),
          eq(oauthCredentials.provider, 'linear')
        )
      )
      .run();
  }

  async updateLinearEstimateField(
    roomKey: string,
    estimateField: string | null
  ): Promise<void> {
    const existing = await this.getLinearOAuthCredentials(roomKey);
    if (!existing) {
      return;
    }

    await this.saveLinearOAuthCredentials({
      roomKey: existing.roomKey,
      accessToken: existing.accessToken,
      refreshToken: existing.refreshToken,
      tokenType: existing.tokenType,
      expiresAt: existing.expiresAt,
      scope: existing.scope,
      linearOrganizationId: existing.linearOrganizationId,
      linearUserId: existing.linearUserId,
      linearUserEmail: existing.linearUserEmail,
      estimateField,
      authorizedBy: existing.authorizedBy,
    });
  }

  async getGithubOAuthCredentials(roomKey: string): Promise<{
    id: number;
    roomKey: string;
    accessToken: string;
    refreshToken: string | null;
    tokenType: string;
    expiresAt: number;
    scope: string | null;
    githubLogin: string | null;
    githubUserEmail: string | null;
    defaultOwner: string | null;
    defaultRepo: string | null;
    authorizedBy: string;
    createdAt: number;
    updatedAt: number;
  } | null> {
    const row = this.db
      .select()
      .from(oauthCredentials)
      .where(
        and(
          eq(oauthCredentials.roomKey, roomKey),
          eq(oauthCredentials.provider, 'github')
        )
      )
      .get();

    if (!row) {
      return null;
    }

    const metadata = safeJsonParse<{
      githubLogin?: string | null;
      githubUserEmail?: string | null;
      defaultOwner?: string | null;
      defaultRepo?: string | null;
    }>(row.metadata ?? '{}');

    const accessToken = await this.tokenCipher.decrypt(row.accessToken);
    const refreshToken = await this.decryptToken(row.refreshToken);

    return {
      id: row.id,
      roomKey: row.roomKey,
      accessToken,
      refreshToken,
      tokenType: row.tokenType,
      expiresAt: row.expiresAt,
      scope: row.scope,
      githubLogin: metadata?.githubLogin ?? null,
      githubUserEmail: metadata?.githubUserEmail ?? null,
      defaultOwner: metadata?.defaultOwner ?? null,
      defaultRepo: metadata?.defaultRepo ?? null,
      authorizedBy: row.authorizedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async saveGithubOAuthCredentials(credentials: {
    roomKey: string;
    accessToken: string;
    refreshToken: string | null;
    tokenType: string;
    expiresAt: number;
    scope: string | null;
    githubLogin: string | null;
    githubUserEmail: string | null;
    defaultOwner: string | null;
    defaultRepo: string | null;
    authorizedBy: string;
  }): Promise<void> {
    const now = Date.now();
    const metadata = JSON.stringify({
      githubLogin: credentials.githubLogin,
      githubUserEmail: credentials.githubUserEmail,
      defaultOwner: credentials.defaultOwner,
      defaultRepo: credentials.defaultRepo,
    });

    const encryptedAccessToken = await this.tokenCipher.encrypt(
      credentials.accessToken
    );
    const encryptedRefreshToken = await this.encryptToken(
      credentials.refreshToken
    );

    this.db
      .insert(oauthCredentials)
      .values({
        roomKey: credentials.roomKey,
        provider: 'github',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenType: credentials.tokenType,
        expiresAt: credentials.expiresAt,
        scope: credentials.scope,
        authorizedBy: credentials.authorizedBy,
        metadata,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [oauthCredentials.roomKey, oauthCredentials.provider],
        set: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenType: credentials.tokenType,
          expiresAt: credentials.expiresAt,
          scope: credentials.scope,
          authorizedBy: credentials.authorizedBy,
          metadata,
          updatedAt: now,
        },
      })
      .run();
  }

  deleteGithubOAuthCredentials(roomKey: string): void {
    this.db
      .delete(oauthCredentials)
      .where(
        and(
          eq(oauthCredentials.roomKey, roomKey),
          eq(oauthCredentials.provider, 'github')
        )
      )
      .run();
  }
}
