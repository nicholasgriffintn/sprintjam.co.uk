import type {
  DurableObjectStorage,
  DurableObjectTransaction,
  SqlStorage,
} from "@cloudflare/workers-types";

import type {
  JudgeMetadata,
  PasscodeHashPayload,
  RoomData,
  RoomSettings,
  StructuredVote,
  TicketQueueItem,
  TicketVote,
  VoteValue,
  CodenamesState,
} from '../types';
import { serializeJSON, serializeVote } from '../utils/serialize';
import { parseJudgeScore, parseVote, safeJsonParse } from '../utils/parse';
import { DEFAULT_TIMER_DURATION_SECONDS } from '../constants';
import {
  SESSION_TOKEN_TTL_MS,
  parsePasscodeHash,
  serializePasscodeHash,
} from '../utils/room-cypto';
import { TokenCipher } from '../utils/token-crypto';

const ROOM_ROW_ID = 1;
type SqlEnabledTransaction = DurableObjectTransaction & { sql: SqlStorage };

export class PlanningRoomRepository {
  private readonly sql: SqlStorage;
  private readonly anonymousName = 'Anonymous';

  constructor(
    private readonly storage: DurableObjectStorage,
    private readonly tokenCipher: TokenCipher
  ) {
    if (!tokenCipher) {
      throw new Error('Token cipher is required');
    }
    this.sql = storage.sql;
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

  initializeSchema() {
    this.storage.transactionSync(() => {
      this.sql.exec(
        `CREATE TABLE IF NOT EXISTS room_meta (
          id INTEGER PRIMARY KEY CHECK (id = ${ROOM_ROW_ID}),
          room_key TEXT NOT NULL,
          moderator TEXT NOT NULL,
          show_votes INTEGER NOT NULL DEFAULT 0,
          passcode TEXT,
          judge_score TEXT,
          judge_metadata TEXT,
          settings TEXT NOT NULL,
          current_strudel_code TEXT,
          current_strudel_generation_id TEXT,
          strudel_phase TEXT,
          strudel_is_playing INTEGER NOT NULL DEFAULT 0,
          current_ticket_id INTEGER,
          timer_seconds INTEGER DEFAULT 0,
          timer_last_updated INTEGER DEFAULT 0,
          timer_is_paused INTEGER DEFAULT 0,
          timer_target_duration INTEGER DEFAULT 600,
          timer_round_anchor INTEGER DEFAULT 0,
          timer_auto_reset INTEGER DEFAULT 1,
          game_states TEXT
        )`
      );

      this.sql.exec(
        `CREATE TABLE IF NOT EXISTS session_tokens (
          user_name TEXT PRIMARY KEY,
          token TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )`
      );

      this.sql.exec(
        `CREATE TABLE IF NOT EXISTS room_users (
          user_name TEXT PRIMARY KEY,
          avatar TEXT,
          is_connected INTEGER NOT NULL DEFAULT 0,
          ordinal INTEGER NOT NULL
        )`
      );

      this.sql.exec(
        `CREATE TABLE IF NOT EXISTS room_votes (
          user_name TEXT PRIMARY KEY,
          vote TEXT NOT NULL,
          structured_vote_payload TEXT
        )`
      );

      this.sql.exec(
        `CREATE TABLE IF NOT EXISTS ticket_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ticket_id TEXT NOT NULL UNIQUE,
          title TEXT,
          description TEXT,
          status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'blocked', 'completed')) DEFAULT 'pending',
          outcome TEXT,
          created_at INTEGER NOT NULL,
          completed_at INTEGER,
          ordinal INTEGER NOT NULL,
          external_service TEXT CHECK(external_service IN ('jira', 'linear', 'github', 'clickup', 'asana', 'youtrack', 'zoho', 'trello', 'monday', 'none')) DEFAULT 'none',
          external_service_id TEXT,
          external_service_metadata TEXT
        )`
      );

      this.sql.exec(
        `CREATE TABLE IF NOT EXISTS ticket_votes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ticket_queue_id INTEGER NOT NULL,
          user_name TEXT NOT NULL,
          vote TEXT NOT NULL,
          structured_vote_payload TEXT,
          voted_at INTEGER NOT NULL,
          FOREIGN KEY (ticket_queue_id) REFERENCES ticket_queue(id) ON DELETE CASCADE,
          UNIQUE(ticket_queue_id, user_name)
        )`
      );

      this.sql.exec(
        `CREATE TABLE IF NOT EXISTS oauth_credentials (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          room_key TEXT NOT NULL,
          provider TEXT NOT NULL CHECK(provider IN ('jira', 'linear', 'github', 'clickup', 'asana', 'youtrack', 'zoho', 'trello', 'monday', 'none')),
          access_token TEXT NOT NULL,
          refresh_token TEXT,
          token_type TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          scope TEXT,
          authorized_by TEXT NOT NULL,
          metadata TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          UNIQUE(room_key, provider)
        )`
      );
    });
  }

  async getRoomData(): Promise<RoomData | undefined> {
    const row = this.sql
      .exec<{
        room_key: string;
        moderator: string;
        show_votes: number;
        passcode_hash: string | null;
        judge_score: string | null;
        judge_metadata: string | null;
        settings: string;
        current_strudel_code: string | null;
        current_strudel_generation_id: string | null;
        strudel_phase: string | null;
        strudel_is_playing: number | null;
        timer_seconds: number | null;
        timer_last_updated: number | null;
        timer_is_paused: number | null;
        timer_target_duration: number | null;
        timer_round_anchor: number | null;
        timer_auto_reset: number | null;
        game_states: string | null;
      }>(
        `SELECT
           room_key,
           moderator,
           show_votes,
           passcode AS passcode_hash,
           judge_score,
           judge_metadata,
           settings,
           current_strudel_code,
           current_strudel_generation_id,
           strudel_phase,
           strudel_is_playing,
           timer_seconds,
           timer_last_updated,
           timer_is_paused,
           timer_target_duration,
           timer_round_anchor,
           timer_auto_reset,
           game_states
         FROM room_meta
         WHERE id = ${ROOM_ROW_ID}`
      )
      .toArray()[0];

    if (!row) {
      return undefined;
    }

    const users = this.sql
      .exec<{
        user_name: string;
        avatar: string | null;
        is_connected: number;
      }>(
        `SELECT user_name, avatar, is_connected
         FROM room_users
         ORDER BY ordinal ASC`
      )
      .toArray();

    const votes = this.sql
      .exec<{
        user_name: string;
        vote: string;
        structured_vote_payload: string | null;
      }>('SELECT * FROM room_votes')
      .toArray();

    const connectedUsers: Record<string, boolean> = {};
    const userAvatars: Record<string, string> = {};
    const userList: string[] = [];

    for (const user of users) {
      userList.push(user.user_name);
      connectedUsers[user.user_name] = !!user.is_connected;
      if (user.avatar) {
        userAvatars[user.user_name] = user.avatar;
      }
    }

    const voteMap: Record<string, string | number> = {};
    for (const entry of votes) {
      voteMap[entry.user_name] = parseVote(entry.vote);
    }

    const structuredVoteMap: Record<string, StructuredVote> = {};
    for (const entry of votes) {
      const payload = entry.structured_vote_payload;
      if (!payload) {
        continue;
      }
      try {
        const structuredVoteData = safeJsonParse<StructuredVote>(payload);
        if (!structuredVoteData) {
          throw new Error('Failed to parse structured vote from storage');
        }
        structuredVoteMap[entry.user_name] = structuredVoteData;
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
      row.timer_is_paused === null || row.timer_is_paused === undefined
        ? 1
        : row.timer_is_paused;

    const hasTimerState =
      row.timer_seconds !== null ||
      row.timer_last_updated !== null ||
      row.timer_target_duration !== null ||
      row.timer_round_anchor !== null ||
      row.timer_auto_reset !== null;

    const timerState = hasTimerState
      ? {
          running:
            !!row.timer_last_updated &&
            row.timer_last_updated > 0 &&
            !timerPausedValue,
          seconds: row.timer_seconds ?? 0,
          lastUpdateTime: row.timer_last_updated ?? 0,
          targetDurationSeconds:
            row.timer_target_duration ?? DEFAULT_TIMER_DURATION_SECONDS,
          roundAnchorSeconds: row.timer_round_anchor ?? 0,
          autoResetOnVotesReset:
            row.timer_auto_reset === null || row.timer_auto_reset === undefined
              ? true
              : row.timer_auto_reset !== 0,
        }
      : undefined;

    const parsedGameStates =
      row.game_states && row.game_states.length > 0
        ? safeJsonParse<Record<string, unknown>>(row.game_states) ?? undefined
        : undefined;

    const codenamesState =
      (parsedGameStates?.codenames as CodenamesState | undefined) ?? undefined;
    const gameStates =
      parsedGameStates ??
      (codenamesState ? { codenames: codenamesState } : undefined);

    const roomData: RoomData = {
      key: row.room_key,
      users: userList,
      votes: voteMap,
      structuredVotes: structuredVoteMap,
      showVotes: !!row.show_votes,
      moderator: row.moderator,
      connectedUsers,
      judgeScore: parseJudgeScore(row.judge_score),
      judgeMetadata: row.judge_metadata
        ? safeJsonParse<JudgeMetadata>(row.judge_metadata)
        : undefined,
      settings,
      passcodeHash: parsePasscodeHash(row.passcode_hash) ?? undefined,
      userAvatars:
        Object.keys(userAvatars).length > 0 ? userAvatars : undefined,
      currentStrudelCode: row.current_strudel_code ?? undefined,
      currentStrudelGenerationId:
        row.current_strudel_generation_id ?? undefined,
      strudelPhase: row.strudel_phase ?? undefined,
      strudelIsPlaying: row.strudel_is_playing
        ? !!row.strudel_is_playing
        : undefined,
      currentTicket,
      ticketQueue: ticketQueue.length > 0 ? ticketQueue : undefined,
      timerState,
      gameStates,
      codenamesState,
    };

    return roomData;
  }

  async replaceRoomData(roomData: RoomData): Promise<void> {
    await this.storage.transaction(async (txn) => {
      const sql = this.getSql(txn);

      sql.exec(
        `INSERT INTO room_meta (
          id,
          room_key,
          moderator,
          show_votes,
          passcode,
          judge_score,
          judge_metadata,
          settings,
          current_strudel_code,
          current_strudel_generation_id,
          strudel_phase,
          strudel_is_playing,
          timer_seconds,
          timer_last_updated,
          timer_is_paused,
          timer_target_duration,
          timer_round_anchor,
          timer_auto_reset,
          game_states
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          room_key = excluded.room_key,
          moderator = excluded.moderator,
          show_votes = excluded.show_votes,
          passcode = excluded.passcode,
          judge_score = excluded.judge_score,
          judge_metadata = excluded.judge_metadata,
          settings = excluded.settings,
          current_strudel_code = excluded.current_strudel_code,
          current_strudel_generation_id = excluded.current_strudel_generation_id,
          strudel_phase = excluded.strudel_phase,
          strudel_is_playing = excluded.strudel_is_playing,
          timer_seconds = excluded.timer_seconds,
          timer_last_updated = excluded.timer_last_updated,
          timer_is_paused = excluded.timer_is_paused,
          timer_target_duration = excluded.timer_target_duration,
          timer_round_anchor = excluded.timer_round_anchor,
          timer_auto_reset = excluded.timer_auto_reset,
          game_states = excluded.game_states`,
        ROOM_ROW_ID,
        roomData.key,
        roomData.moderator,
        roomData.showVotes ? 1 : 0,
        serializePasscodeHash(roomData.passcodeHash),
        roomData.judgeScore === undefined || roomData.judgeScore === null
          ? null
          : String(roomData.judgeScore),
        serializeJSON(roomData.judgeMetadata),
        serializeJSON(roomData.settings),
        roomData.currentStrudelCode ?? null,
        roomData.currentStrudelGenerationId ?? null,
        roomData.strudelPhase ?? null,
        roomData.strudelIsPlaying ? 1 : 0,
        roomData.timerState?.seconds ?? null,
        roomData.timerState?.lastUpdateTime ?? null,
        roomData.timerState?.running ? 1 : 0,
        roomData.timerState?.targetDurationSeconds ??
          DEFAULT_TIMER_DURATION_SECONDS,
        roomData.timerState?.roundAnchorSeconds ?? 0,
        roomData.timerState?.autoResetOnVotesReset === false ? 0 : 1,
        serializeJSON(
          roomData.gameStates ??
            (roomData.codenamesState
              ? { codenames: roomData.codenamesState }
              : undefined)
        )
      );

      sql.exec('DELETE FROM room_users');
      roomData.users.forEach((user, index) => {
        const isConnected = roomData.connectedUsers?.[user] ? 1 : 0;
        const avatar = roomData.userAvatars?.[user] ?? null;
        sql.exec(
          `INSERT INTO room_users (user_name, avatar, is_connected, ordinal)
           VALUES (?, ?, ?, ?)`,
          user,
          avatar,
          isConnected,
          index
        );
      });

      sql.exec('DELETE FROM room_votes');
      Object.entries(roomData.votes).forEach(([user, vote]) => {
        const structuredVote = roomData.structuredVotes?.[user] ?? null;
        sql.exec(
          `INSERT INTO room_votes (user_name, vote, structured_vote_payload)
           VALUES (?, ?, ?)`,
          user,
          serializeVote(vote),
          structuredVote ? JSON.stringify(structuredVote) : null
        );
      });
    });
  }

  ensureUser(userName: string): string {
    const existing = this.sql
      .exec<{ user_name: string }>(
        `SELECT user_name FROM room_users WHERE LOWER(user_name) = LOWER(?)`,
        userName
      )
      .toArray()[0]?.user_name;
    const canonicalName = existing ?? userName;

    this.sql.exec(
      `INSERT OR IGNORE INTO room_users (user_name, avatar, is_connected, ordinal)
       VALUES (
         ?,
         NULL,
         0,
         COALESCE((SELECT MAX(ordinal) + 1 FROM room_users), 0)
       )`,
      canonicalName
    );

    return canonicalName;
  }

  setUserConnection(userName: string, isConnected: boolean) {
    const canonicalName = this.ensureUser(userName);
    this.sql.exec(
      `UPDATE room_users SET is_connected = ? WHERE user_name = ?`,
      isConnected ? 1 : 0,
      canonicalName
    );
  }

  setUserAvatar(userName: string, avatar?: string) {
    if (!avatar) {
      return;
    }
    const canonicalName = this.ensureUser(userName);
    this.sql.exec(
      `UPDATE room_users SET avatar = ? WHERE user_name = ?`,
      avatar,
      canonicalName
    );
  }

  setModerator(userName: string) {
    this.sql.exec(
      `UPDATE room_meta SET moderator = ? WHERE id = ${ROOM_ROW_ID}`,
      userName
    );
  }

  setShowVotes(showVotes: boolean) {
    this.sql.exec(
      `UPDATE room_meta SET show_votes = ? WHERE id = ${ROOM_ROW_ID}`,
      showVotes ? 1 : 0
    );
  }

  setTimerState(running: boolean, seconds: number, lastUpdateTime: number) {
    this.sql.exec(
      `UPDATE room_meta
       SET timer_is_paused = ?, timer_seconds = ?, timer_last_updated = ?
       WHERE id = ${ROOM_ROW_ID}`,
      running ? 1 : 0,
      seconds,
      lastUpdateTime
    );
  }

  updateTimerConfig(config: {
    targetDurationSeconds?: number;
    roundAnchorSeconds?: number;
    autoResetOnVotesReset?: boolean;
  }) {
    const updates: string[] = [];
    const params: number[] = [];

    if (config.targetDurationSeconds !== undefined) {
      updates.push('timer_target_duration = ?');
      params.push(config.targetDurationSeconds);
    }
    if (config.roundAnchorSeconds !== undefined) {
      updates.push('timer_round_anchor = ?');
      params.push(config.roundAnchorSeconds);
    }
    if (config.autoResetOnVotesReset !== undefined) {
      updates.push('timer_auto_reset = ?');
      params.push(config.autoResetOnVotesReset ? 1 : 0);
    }

    if (updates.length === 0) {
      return;
    }

    this.sql.exec(
      `UPDATE room_meta
       SET ${updates.join(', ')}
       WHERE id = ${ROOM_ROW_ID}`,
      ...params
    );
  }

  startTimer(currentTime: number) {
    this.sql.exec(
      `UPDATE room_meta
       SET timer_is_paused = 0, timer_last_updated = ?
       WHERE id = ${ROOM_ROW_ID}`,
      currentTime
    );
  }

  pauseTimer(currentTime: number) {
    const row = this.sql
      .exec<{
        timer_is_paused: number;
        timer_seconds: number;
        timer_last_updated: number;
      }>(
        `SELECT timer_is_paused, timer_seconds, timer_last_updated
         FROM room_meta WHERE id = ${ROOM_ROW_ID}`
      )
      .toArray()[0];

    if (row && !row.timer_is_paused) {
      const elapsedSinceLastUpdate = Math.floor(
        (currentTime - row.timer_last_updated) / 1000
      );
      const existingSeconds = row.timer_seconds ?? 0;
      const newSeconds = existingSeconds + elapsedSinceLastUpdate;
      this.sql.exec(
        `UPDATE room_meta
         SET timer_is_paused = 1, timer_seconds = ?, timer_last_updated = ?
         WHERE id = ${ROOM_ROW_ID}`,
        newSeconds,
        currentTime
      );
    }
  }

  resetTimer() {
    this.sql.exec(
      `UPDATE room_meta
       SET timer_is_paused = 0, timer_seconds = 0, timer_last_updated = 0, timer_round_anchor = 0
       WHERE id = ${ROOM_ROW_ID}`
    );
  }

  setVote(userName: string, vote: string | number) {
    const canonicalName = this.ensureUser(userName);
    this.sql.exec(
      `INSERT INTO room_votes (user_name, vote, structured_vote_payload)
       VALUES (?, ?, NULL)
       ON CONFLICT(user_name) DO UPDATE SET vote = excluded.vote, structured_vote_payload = NULL`,
      canonicalName,
      serializeVote(vote)
    );
  }

  clearVotes() {
    this.sql.exec('DELETE FROM room_votes');
  }

  setStructuredVote(userName: string, vote: StructuredVote) {
    const canonicalName = this.ensureUser(userName);
    this.sql.exec(
      `UPDATE room_votes SET structured_vote_payload = ? WHERE user_name = ?`,
      JSON.stringify(vote),
      canonicalName
    );
  }

  clearStructuredVotes() {
    this.sql.exec('UPDATE room_votes SET structured_vote_payload = NULL');
  }

  setJudgeState(score: string | number | null, metadata?: JudgeMetadata) {
    this.sql.exec(
      `UPDATE room_meta
       SET judge_score = ?, judge_metadata = ?
       WHERE id = ${ROOM_ROW_ID}`,
      score === null || score === undefined ? null : String(score),
      serializeJSON(metadata)
    );
  }

  setSettings(settings: RoomSettings) {
    this.sql.exec(
      `UPDATE room_meta SET settings = ? WHERE id = ${ROOM_ROW_ID}`,
      JSON.stringify(settings)
    );
  }

  setPasscodeHash(passcodeHash: PasscodeHashPayload | null) {
    this.sql.exec(
      `UPDATE room_meta SET passcode = ? WHERE id = ${ROOM_ROW_ID}`,
      serializePasscodeHash(passcodeHash)
    );
  }

  getPasscodeHash(): PasscodeHashPayload | null {
    const result = this.sql
      .exec<{
        passcode: string | null;
      }>(`SELECT passcode FROM room_meta WHERE id = ${ROOM_ROW_ID}`)
      .toArray()[0];

    return parsePasscodeHash(result?.passcode ?? null);
  }

  setSessionToken(userName: string, token: string) {
    const canonicalName = this.ensureUser(userName);
    const existingTokenOwner = this.sql
      .exec<{ user_name: string }>(
        `SELECT user_name FROM session_tokens WHERE LOWER(user_name) = LOWER(?)`,
        canonicalName
      )
      .toArray()[0]?.user_name;
    const tokenOwner = existingTokenOwner ?? canonicalName;

    this.sql.exec(
      `INSERT INTO session_tokens (user_name, token, created_at)
       VALUES (?, ?, ?)
       ON CONFLICT(user_name)
       DO UPDATE SET token = excluded.token, created_at = excluded.created_at`,
      tokenOwner,
      token,
      Date.now()
    );
  }

  validateSessionToken(userName: string, token: string | null): boolean {
    if (!token) {
      return false;
    }
    const record = this.sql
      .exec<{
        token: string | null;
        created_at: number | null;
      }>(
        `SELECT token, created_at
         FROM session_tokens
         WHERE LOWER(user_name) = LOWER(?)`,
        userName
      )
      .toArray()[0];

    if (!record?.token) {
      return false;
    }

    const isExpired =
      typeof record.created_at === 'number' &&
      Date.now() - record.created_at > SESSION_TOKEN_TTL_MS;

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
    this.sql.exec(
      `UPDATE room_meta
       SET current_strudel_code = ?,
           current_strudel_generation_id = ?,
           strudel_phase = ?
       WHERE id = ${ROOM_ROW_ID}`,
      options.code ?? null,
      options.generationId ?? null,
      options.phase ?? null
    );
  }

  setStrudelPlayback(isPlaying: boolean) {
    this.sql.exec(
      `UPDATE room_meta
       SET strudel_is_playing = ?
       WHERE id = ${ROOM_ROW_ID}`,
      isPlaying ? 1 : 0
    );
  }

  getCurrentTicket(options?: {
    anonymizeVotes?: boolean;
  }): TicketQueueItem | undefined {
    const currentTicketId = this.sql
      .exec<{
        current_ticket_id: number | null;
      }>(`SELECT current_ticket_id FROM room_meta WHERE id = ${ROOM_ROW_ID}`)
      .toArray()[0]?.current_ticket_id;

    if (!currentTicketId) {
      return undefined;
    }

    return this.getTicketById(currentTicketId, options);
  }

  getTicketById(
    id: number,
    options?: { anonymizeVotes?: boolean }
  ): TicketQueueItem | undefined {
    const row = this.sql
      .exec<{
        id: number;
        ticket_id: string;
        title: string | null;
        description: string | null;
        status: 'pending' | 'in_progress' | 'completed' | 'blocked';
        outcome: string | null;
        created_at: number;
        completed_at: number | null;
        ordinal: number;
        external_service: 'jira' | 'linear' | 'github' | 'none';
        external_service_id: string | null;
        external_service_metadata: string | null;
      }>(`SELECT * FROM ticket_queue WHERE id = ?`, id)
      .toArray()[0];

    if (!row) {
      return undefined;
    }

    const votes = this.getTicketVotes(row.id, options?.anonymizeVotes);

    return {
      id: row.id,
      ticketId: row.ticket_id,
      title: row.title ?? undefined,
      description: row.description ?? undefined,
      status: row.status,
      outcome: row.outcome ?? undefined,
      createdAt: row.created_at,
      completedAt: row.completed_at ?? undefined,
      ordinal: row.ordinal,
      externalService: row.external_service,
      externalServiceId: row.external_service_id ?? undefined,
      externalServiceMetadata: row.external_service_metadata
        ? safeJsonParse<Record<string, unknown>>(row.external_service_metadata)
        : undefined,
      votes,
    };
  }

  getTicketQueue(options?: { anonymizeVotes?: boolean }): TicketQueueItem[] {
    const rows = this.sql
      .exec<{
        id: number;
        ticket_id: string;
        title: string | null;
        description: string | null;
        status: 'pending' | 'in_progress' | 'completed' | 'blocked';
        outcome: string | null;
        created_at: number;
        completed_at: number | null;
        ordinal: number;
        external_service: 'jira' | 'linear' | 'github' | 'none';
        external_service_id: string | null;
        external_service_metadata: string | null;
      }>('SELECT * FROM ticket_queue ORDER BY ordinal ASC')
      .toArray();

    return rows.map((row) => {
      const votes = this.getTicketVotes(row.id, options?.anonymizeVotes);

      return {
        id: row.id,
        ticketId: row.ticket_id,
        title: row.title ?? undefined,
        description: row.description ?? undefined,
        status: row.status,
        outcome: row.outcome ?? undefined,
        createdAt: row.created_at,
        completedAt: row.completed_at ?? undefined,
        ordinal: row.ordinal,
        externalService: row.external_service,
        externalServiceId: row.external_service_id ?? undefined,
        externalServiceMetadata: row.external_service_metadata
          ? safeJsonParse<Record<string, unknown>>(
              row.external_service_metadata
            )
          : undefined,
        votes,
      };
    });
  }

  getTicketVotes(
    ticketQueueId: number,
    anonymizeVotes?: boolean
  ): TicketVote[] {
    const rows = this.sql
      .exec<{
        id: number;
        ticket_queue_id: number;
        user_name: string;
        vote: string;
        structured_vote_payload: string | null;
        voted_at: number;
      }>(
        'SELECT * FROM ticket_votes WHERE ticket_queue_id = ? ORDER BY voted_at ASC',
        ticketQueueId
      )
      .toArray();

    return rows.map((row) => {
      const structuredVotePayload = row.structured_vote_payload
        ? safeJsonParse<StructuredVote>(row.structured_vote_payload)
        : undefined;

      return {
        id: row.id,
        ticketQueueId: row.ticket_queue_id,
        userName: anonymizeVotes ? this.anonymousName : row.user_name,
        vote: parseVote(row.vote),
        structuredVotePayload,
        votedAt: row.voted_at,
      };
    });
  }

  createTicket(
    ticket: Omit<TicketQueueItem, 'id' | 'createdAt' | 'votes'>
  ): TicketQueueItem {
    const result = this.sql.exec(
      `INSERT INTO ticket_queue (
        ticket_id,
        title,
        description,
        status,
        outcome,
        created_at,
        completed_at,
        ordinal,
        external_service,
        external_service_id,
        external_service_metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id`,
      ticket.ticketId,
      ticket.title ?? null,
      ticket.description ?? null,
      ticket.status,
      ticket.outcome ?? null,
      Date.now(),
      ticket.completedAt ?? null,
      ticket.ordinal,
      ticket.externalService,
      ticket.externalServiceId ?? null,
      serializeJSON(ticket.externalServiceMetadata)
    );

    const insertedId = result.toArray()[0] as { id: number };
    const created = this.getTicketById(insertedId.id);
    if (!created) {
      throw new Error('Failed to create ticket');
    }
    return created;
  }

  updateTicket(
    id: number,
    updates: Partial<Omit<TicketQueueItem, 'id' | 'createdAt' | 'votes'>>
  ): void {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.ticketId !== undefined) {
      fields.push('ticket_id = ?');
      values.push(updates.ticketId);
    }
    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title ?? null);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description ?? null);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.outcome !== undefined) {
      fields.push('outcome = ?');
      values.push(updates.outcome ?? null);
    }
    if (updates.completedAt !== undefined) {
      fields.push('completed_at = ?');
      values.push(updates.completedAt ?? null);
    }
    if (updates.ordinal !== undefined) {
      fields.push('ordinal = ?');
      values.push(updates.ordinal);
    }
    if (updates.externalService !== undefined) {
      fields.push('external_service = ?');
      values.push(updates.externalService);
    }
    if (updates.externalServiceId !== undefined) {
      fields.push('external_service_id = ?');
      values.push(updates.externalServiceId ?? null);
    }
    if (updates.externalServiceMetadata !== undefined) {
      fields.push('external_service_metadata = ?');
      values.push(serializeJSON(updates.externalServiceMetadata));
    }

    if (fields.length === 0) {
      return;
    }

    values.push(id);
    this.sql.exec(
      `UPDATE ticket_queue SET ${fields.join(', ')} WHERE id = ?`,
      ...values
    );
  }

  deleteTicket(id: number): void {
    this.sql.exec('DELETE FROM ticket_queue WHERE id = ?', id);
  }

  setCurrentTicket(ticketId: number | null): void {
    this.sql.exec(
      `UPDATE room_meta SET current_ticket_id = ? WHERE id = ${ROOM_ROW_ID}`,
      ticketId
    );
  }

  getTicketByTicketKey(
    ticketKey: string,
    options?: { anonymizeVotes?: boolean }
  ): TicketQueueItem | undefined {
    const row = this.sql
      .exec<{ id: number }>(
        `SELECT id FROM ticket_queue WHERE ticket_id = ? LIMIT 1`,
        ticketKey
      )
      .toArray()[0];

    if (!row) return undefined;
    return this.getTicketById(row.id, options);
  }

  logTicketVote(
    ticketQueueId: number,
    userName: string,
    vote: VoteValue,
    structuredVote?: StructuredVote
  ): void {
    this.sql.exec(
      `INSERT INTO ticket_votes (
        ticket_queue_id,
        user_name,
        vote,
        structured_vote_payload,
        voted_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(ticket_queue_id, user_name)
      DO UPDATE SET
        vote = excluded.vote,
        structured_vote_payload = excluded.structured_vote_payload,
        voted_at = excluded.voted_at`,
      ticketQueueId,
      userName,
      serializeVote(vote),
      structuredVote ? JSON.stringify(structuredVote) : null,
      Date.now()
    );
  }

  getNextTicketId({ externalService = 'none' }): string {
    const maxTicket = this.sql
      .exec<{ ticket_id: string }>(
        `SELECT ticket_id FROM ticket_queue 
         WHERE ticket_id LIKE 'SPRINTJAM-%' 
         ORDER BY CAST(SUBSTR(ticket_id, 11) AS INTEGER) DESC 
         LIMIT 1`
      )
      .toArray()[0];

    if (!maxTicket && externalService === 'none') {
      return 'SPRINTJAM-001';
    } else if (!maxTicket) {
      return '';
    }

    const match = maxTicket.ticket_id.match(/SPRINTJAM-(\d+)/);
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
      this.sql.exec(
        'UPDATE ticket_queue SET ordinal = ? WHERE id = ?',
        index,
        id
      );
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
    const row = this.sql
      .exec<{
        id: number;
        room_key: string;
        provider: string;
        access_token: string;
        refresh_token: string | null;
        token_type: string;
        expires_at: number;
        scope: string | null;
        authorized_by: string;
        metadata: string | null;
        created_at: number;
        updated_at: number;
      }>(
        `SELECT * FROM oauth_credentials WHERE room_key = ? AND provider = 'jira'`,
        roomKey
      )
      .toArray()[0];

    if (!row) return null;

    const metadata = safeJsonParse<{
      jiraDomain?: string;
      jiraCloudId?: string | null;
      jiraUserId?: string | null;
      jiraUserEmail?: string | null;
      storyPointsField?: string | null;
      sprintField?: string | null;
    }>(row.metadata ?? '{}');

    const accessToken = await this.tokenCipher.decrypt(row.access_token);
    const refreshToken = await this.decryptToken(row.refresh_token);

    return {
      id: row.id,
      roomKey: row.room_key,
      accessToken,
      refreshToken,
      tokenType: row.token_type,
      expiresAt: row.expires_at,
      scope: row.scope,
      jiraDomain: metadata?.jiraDomain ?? '',
      jiraCloudId: metadata?.jiraCloudId ?? null,
      jiraUserId: metadata?.jiraUserId ?? null,
      jiraUserEmail: metadata?.jiraUserEmail ?? null,
      storyPointsField: metadata?.storyPointsField ?? null,
      sprintField: metadata?.sprintField ?? null,
      authorizedBy: row.authorized_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
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

    this.sql.exec(
      `INSERT INTO oauth_credentials (
        room_key,
        provider,
        access_token,
        refresh_token,
        token_type,
        expires_at,
        scope,
        authorized_by,
        metadata,
        created_at,
        updated_at
      ) VALUES (?, 'jira', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(room_key, provider) DO UPDATE SET
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        token_type = excluded.token_type,
        expires_at = excluded.expires_at,
        scope = excluded.scope,
        authorized_by = excluded.authorized_by,
        metadata = excluded.metadata,
        updated_at = excluded.updated_at`,
      credentials.roomKey,
      encryptedAccessToken,
      encryptedRefreshToken,
      credentials.tokenType,
      credentials.expiresAt,
      credentials.scope,
      credentials.authorizedBy,
      metadata,
      now,
      now
    );
  }

  async updateJiraOAuthTokens(
    roomKey: string,
    accessToken: string,
    refreshToken: string | null,
    expiresAt: number
  ): Promise<void> {
    const encryptedAccessToken = await this.tokenCipher.encrypt(accessToken);
    const encryptedRefreshToken = await this.encryptToken(refreshToken);
    this.sql.exec(
      `UPDATE oauth_credentials
       SET access_token = ?, refresh_token = ?, expires_at = ?, updated_at = ?
       WHERE room_key = ? AND provider = 'jira'`,
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt,
      Date.now(),
      roomKey
    );
  }

  deleteJiraOAuthCredentials(roomKey: string): void {
    this.sql.exec(
      "DELETE FROM oauth_credentials WHERE room_key = ? AND provider = 'jira'",
      roomKey
    );
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
    const row = this.sql
      .exec<{
        id: number;
        room_key: string;
        provider: string;
        access_token: string;
        refresh_token: string | null;
        token_type: string;
        expires_at: number;
        scope: string | null;
        authorized_by: string;
        metadata: string | null;
        created_at: number;
        updated_at: number;
      }>(
        `SELECT * FROM oauth_credentials WHERE room_key = ? AND provider = 'linear'`,
        roomKey
      )
      .toArray()[0];

    if (!row) return null;

    const metadata = safeJsonParse<{
      linearOrganizationId?: string | null;
      linearUserId?: string | null;
      linearUserEmail?: string | null;
      estimateField?: string | null;
    }>(row.metadata ?? '{}');

    const accessToken = await this.tokenCipher.decrypt(row.access_token);
    const refreshToken = await this.decryptToken(row.refresh_token);

    return {
      id: row.id,
      roomKey: row.room_key,
      accessToken,
      refreshToken,
      tokenType: row.token_type,
      expiresAt: row.expires_at,
      scope: row.scope,
      linearOrganizationId: metadata?.linearOrganizationId ?? null,
      linearUserId: metadata?.linearUserId ?? null,
      linearUserEmail: metadata?.linearUserEmail ?? null,
      estimateField: metadata?.estimateField ?? null,
      authorizedBy: row.authorized_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
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

    this.sql.exec(
      `INSERT INTO oauth_credentials (
        room_key,
        provider,
        access_token,
        refresh_token,
        token_type,
        expires_at,
        scope,
        authorized_by,
        metadata,
        created_at,
        updated_at
      ) VALUES (?, 'linear', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(room_key, provider) DO UPDATE SET
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        token_type = excluded.token_type,
        expires_at = excluded.expires_at,
        scope = excluded.scope,
        authorized_by = excluded.authorized_by,
        metadata = excluded.metadata,
        updated_at = excluded.updated_at`,
      credentials.roomKey,
      encryptedAccessToken,
      encryptedRefreshToken,
      credentials.tokenType,
      credentials.expiresAt,
      credentials.scope,
      credentials.authorizedBy,
      metadata,
      now,
      now
    );
  }

  async updateLinearOAuthTokens(
    roomKey: string,
    accessToken: string,
    refreshToken: string | null,
    expiresAt: number
  ): Promise<void> {
    const encryptedAccessToken = await this.tokenCipher.encrypt(accessToken);
    const encryptedRefreshToken = await this.encryptToken(refreshToken);
    this.sql.exec(
      `UPDATE oauth_credentials
       SET access_token = ?, refresh_token = ?, expires_at = ?, updated_at = ?
       WHERE room_key = ? AND provider = 'linear'`,
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt,
      Date.now(),
      roomKey
    );
  }

  deleteLinearOAuthCredentials(roomKey: string): void {
    this.sql.exec(
      "DELETE FROM oauth_credentials WHERE room_key = ? AND provider = 'linear'",
      roomKey
    );
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
    const row = this.sql
      .exec<{
        id: number;
        room_key: string;
        provider: string;
        access_token: string;
        refresh_token: string | null;
        token_type: string;
        expires_at: number;
        scope: string | null;
        authorized_by: string;
        metadata: string | null;
        created_at: number;
        updated_at: number;
      }>(
        `SELECT * FROM oauth_credentials WHERE room_key = ? AND provider = 'github'`,
        roomKey
      )
      .toArray()[0];

    if (!row) {
      return null;
    }

    const metadata = safeJsonParse<{
      githubLogin?: string | null;
      githubUserEmail?: string | null;
      defaultOwner?: string | null;
      defaultRepo?: string | null;
    }>(row.metadata ?? '{}');

    const accessToken = await this.tokenCipher.decrypt(row.access_token);
    const refreshToken = await this.decryptToken(row.refresh_token);

    return {
      id: row.id,
      roomKey: row.room_key,
      accessToken,
      refreshToken,
      tokenType: row.token_type,
      expiresAt: row.expires_at,
      scope: row.scope,
      githubLogin: metadata?.githubLogin ?? null,
      githubUserEmail: metadata?.githubUserEmail ?? null,
      defaultOwner: metadata?.defaultOwner ?? null,
      defaultRepo: metadata?.defaultRepo ?? null,
      authorizedBy: row.authorized_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
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

    this.sql.exec(
      `INSERT INTO oauth_credentials (
        room_key,
        provider,
        access_token,
        refresh_token,
        token_type,
        expires_at,
        scope,
        authorized_by,
        metadata,
        created_at,
        updated_at
      ) VALUES (?, 'github', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(room_key, provider) DO UPDATE SET
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        token_type = excluded.token_type,
        expires_at = excluded.expires_at,
        scope = excluded.scope,
        authorized_by = excluded.authorized_by,
        metadata = excluded.metadata,
        updated_at = excluded.updated_at`,
      credentials.roomKey,
      encryptedAccessToken,
      encryptedRefreshToken,
      credentials.tokenType,
      credentials.expiresAt,
      credentials.scope,
      credentials.authorizedBy,
      metadata,
      now,
      now
    );
  }

  deleteGithubOAuthCredentials(roomKey: string): void {
    this.sql.exec(
      "DELETE FROM oauth_credentials WHERE room_key = ? AND provider = 'github'",
      roomKey
    );
  }

  private getSql(txn?: DurableObjectTransaction): SqlStorage {
    if (txn && 'sql' in txn) {
      return (txn as SqlEnabledTransaction).sql;
    }

    return this.sql;
  }
}
