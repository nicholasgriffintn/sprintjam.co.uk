import type {
  DurableObjectStorage,
  DurableObjectTransaction,
  SqlStorage,
} from "@cloudflare/workers-types";

import type {
  RoomData,
  RoomSettings,
  StructuredVote,
  TicketQueueItem,
  TicketVote,
} from "../types";
import { serializeJSON, serializeVote } from "../utils/serialize";
import { parseJudgeScore, parseVote, safeJsonParse } from "../utils/parse";

const ROOM_ROW_ID = 1; // Each PlanningRoom DO only needs one metadata row.
type SqlEnabledTransaction = DurableObjectTransaction & { sql: SqlStorage };

export class PlanningRoomRepository {
  private readonly sql: SqlStorage;

  constructor(private readonly storage: DurableObjectStorage) {
    this.sql = storage.sql;
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
          jira_ticket TEXT,
          settings TEXT NOT NULL,
          current_strudel_code TEXT,
          current_strudel_generation_id TEXT,
          strudel_phase TEXT,
          strudel_is_playing INTEGER NOT NULL DEFAULT 0,
          current_ticket_id INTEGER
        )`,
      );

      this.sql.exec(
        `CREATE TABLE IF NOT EXISTS session_tokens (
          user_name TEXT PRIMARY KEY,
          token TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )`,
      );

      this.sql.exec(
        `CREATE TABLE IF NOT EXISTS room_users (
          user_name TEXT PRIMARY KEY,
          avatar TEXT,
          is_connected INTEGER NOT NULL DEFAULT 0,
          ordinal INTEGER NOT NULL
        )`,
      );

      this.sql.exec(
        `CREATE TABLE IF NOT EXISTS room_votes (
          user_name TEXT PRIMARY KEY,
          vote TEXT NOT NULL
        )`,
      );

      this.sql.exec(
        `CREATE TABLE IF NOT EXISTS room_structured_votes (
          user_name TEXT PRIMARY KEY,
          payload TEXT NOT NULL
        )`,
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
          external_service TEXT CHECK(external_service IN ('jira', 'linear', 'clickup', 'asana', 'youtrack', 'zoho', 'trello', 'monday', 'none')) DEFAULT 'none',
          external_service_id TEXT,
          external_service_metadata TEXT
        )`,
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
        )`,
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
           strudel_is_playing
         FROM room_meta
         WHERE id = ${ROOM_ROW_ID}`,
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
         ORDER BY ordinal ASC`,
      )
      .toArray();

    const votes = this.sql
      .exec<{ user_name: string; vote: string }>("SELECT * FROM room_votes")
      .toArray();

    const structuredVotes = this.sql
      .exec<{
        user_name: string;
        payload: string;
      }>("SELECT * FROM room_structured_votes")
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
    for (const entry of structuredVotes) {
      try {
        const structuredVoteData = safeJsonParse<StructuredVote>(entry.payload);
        if (!structuredVoteData) {
          throw new Error("Failed to parse structured vote from storage");
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
        throw new Error("Failed to parse room settings from storage");
      }
      settings = settingsData;
    } catch {
      throw new Error("Failed to parse room settings from storage");
    }

    const currentTicket = this.getCurrentTicket();
    const ticketQueue = this.getTicketQueue();

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
        ? safeJsonParse<Record<string, unknown>>(row.judge_metadata)
        : undefined,
      settings,
      passcodeHash: row.passcode_hash ?? undefined,
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
          strudel_is_playing
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          strudel_is_playing = excluded.strudel_is_playing`,
        ROOM_ROW_ID,
        roomData.key,
        roomData.moderator,
        roomData.showVotes ? 1 : 0,
        roomData.passcodeHash ?? null,
        roomData.judgeScore === undefined || roomData.judgeScore === null
          ? null
          : String(roomData.judgeScore),
        serializeJSON(roomData.judgeMetadata),
        JSON.stringify(roomData.settings),
        roomData.currentStrudelCode ?? null,
        roomData.currentStrudelGenerationId ?? null,
        roomData.strudelPhase ?? null,
        roomData.strudelIsPlaying ? 1 : 0,
      );

      sql.exec("DELETE FROM room_users");
      roomData.users.forEach((user, index) => {
        const isConnected = roomData.connectedUsers?.[user] ? 1 : 0;
        const avatar = roomData.userAvatars?.[user] ?? null;
        sql.exec(
          `INSERT INTO room_users (user_name, avatar, is_connected, ordinal)
           VALUES (?, ?, ?, ?)`,
          user,
          avatar,
          isConnected,
          index,
        );
      });

      sql.exec("DELETE FROM room_votes");
      Object.entries(roomData.votes).forEach(([user, vote]) => {
        sql.exec(
          `INSERT INTO room_votes (user_name, vote) VALUES (?, ?)`,
          user,
          serializeVote(vote),
        );
      });

      sql.exec("DELETE FROM room_structured_votes");
      if (roomData.structuredVotes) {
        Object.entries(roomData.structuredVotes).forEach(([user, payload]) => {
          sql.exec(
            `INSERT INTO room_structured_votes (user_name, payload)
             VALUES (?, ?)`,
            user,
            JSON.stringify(payload),
          );
        });
      }
    });
  }

  ensureUser(userName: string) {
    this.sql.exec(
      `INSERT OR IGNORE INTO room_users (user_name, avatar, is_connected, ordinal)
       VALUES (
         ?,
         NULL,
         0,
         COALESCE((SELECT MAX(ordinal) + 1 FROM room_users), 0)
       )`,
      userName,
    );
  }

  setUserConnection(userName: string, isConnected: boolean) {
    this.ensureUser(userName);
    this.sql.exec(
      `UPDATE room_users SET is_connected = ? WHERE user_name = ?`,
      isConnected ? 1 : 0,
      userName,
    );
  }

  setUserAvatar(userName: string, avatar?: string) {
    if (!avatar) {
      return;
    }
    this.ensureUser(userName);
    this.sql.exec(
      `UPDATE room_users SET avatar = ? WHERE user_name = ?`,
      avatar,
      userName,
    );
  }

  setModerator(userName: string) {
    this.sql.exec(
      `UPDATE room_meta SET moderator = ? WHERE id = ${ROOM_ROW_ID}`,
      userName,
    );
  }

  setShowVotes(showVotes: boolean) {
    this.sql.exec(
      `UPDATE room_meta SET show_votes = ? WHERE id = ${ROOM_ROW_ID}`,
      showVotes ? 1 : 0,
    );
  }

  setVote(userName: string, vote: string | number) {
    this.ensureUser(userName);
    this.sql.exec(
      `INSERT INTO room_votes (user_name, vote)
       VALUES (?, ?)
       ON CONFLICT(user_name) DO UPDATE SET vote = excluded.vote`,
      userName,
      serializeVote(vote),
    );
  }

  clearVotes() {
    this.sql.exec("DELETE FROM room_votes");
  }

  setStructuredVote(userName: string, vote: StructuredVote) {
    this.ensureUser(userName);
    this.sql.exec(
      `INSERT INTO room_structured_votes (user_name, payload)
       VALUES (?, ?)
       ON CONFLICT(user_name) DO UPDATE SET payload = excluded.payload`,
      userName,
      JSON.stringify(vote),
    );
  }

  clearStructuredVotes() {
    this.sql.exec("DELETE FROM room_structured_votes");
  }

  setJudgeState(
    score: string | number | null,
    metadata?: Record<string, unknown>,
  ) {
    this.sql.exec(
      `UPDATE room_meta
       SET judge_score = ?, judge_metadata = ?
       WHERE id = ${ROOM_ROW_ID}`,
      score === null || score === undefined ? null : String(score),
      serializeJSON(metadata),
    );
  }

  setSettings(settings: RoomSettings) {
    this.sql.exec(
      `UPDATE room_meta SET settings = ? WHERE id = ${ROOM_ROW_ID}`,
      JSON.stringify(settings),
    );
  }

  setPasscodeHash(passcodeHash: string | null) {
    this.sql.exec(
      `UPDATE room_meta SET passcode = ? WHERE id = ${ROOM_ROW_ID}`,
      passcodeHash,
    );
  }

  getPasscodeHash(): string | null {
    const result = this.sql
      .exec<{
        passcode: string | null;
      }>(`SELECT passcode FROM room_meta WHERE id = ${ROOM_ROW_ID}`)
      .toArray()[0];

    return result?.passcode ?? null;
  }

  setSessionToken(userName: string, token: string) {
    this.ensureUser(userName);
    this.sql.exec(
      `INSERT INTO session_tokens (user_name, token, created_at)
       VALUES (?, ?, ?)
       ON CONFLICT(user_name)
       DO UPDATE SET token = excluded.token, created_at = excluded.created_at`,
      userName,
      token,
      Date.now(),
    );
  }

  getSessionToken(userName: string): string | null {
    const result = this.sql
      .exec<{
        token: string | null;
      }>("SELECT token FROM session_tokens WHERE user_name = ?", userName)
      .toArray()[0];
    return result?.token ?? null;
  }

  validateSessionToken(userName: string, token: string | null): boolean {
    if (!token) {
      return false;
    }
    const stored = this.getSessionToken(userName);
    return !!stored && stored === token;
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
      options.phase ?? null,
    );
  }

  setStrudelPlayback(isPlaying: boolean) {
    this.sql.exec(
      `UPDATE room_meta
       SET strudel_is_playing = ?
       WHERE id = ${ROOM_ROW_ID}`,
      isPlaying ? 1 : 0,
    );
  }

  getCurrentTicket(): TicketQueueItem | undefined {
    const currentTicketId = this.sql
      .exec<{
        current_ticket_id: number | null;
      }>(`SELECT current_ticket_id FROM room_meta WHERE id = ${ROOM_ROW_ID}`)
      .toArray()[0]?.current_ticket_id;

    if (!currentTicketId) {
      return undefined;
    }

    return this.getTicketById(currentTicketId);
  }

  getTicketById(id: number): TicketQueueItem | undefined {
    const row = this.sql
      .exec<{
        id: number;
        ticket_id: string;
        title: string | null;
        description: string | null;
        status: "pending" | "in_progress" | "completed";
        outcome: string | null;
        created_at: number;
        completed_at: number | null;
        ordinal: number;
        external_service: "jira" | "none";
        external_service_id: string | null;
        external_service_metadata: string | null;
      }>(`SELECT * FROM ticket_queue WHERE id = ?`, id)
      .toArray()[0];

    if (!row) {
      return undefined;
    }

    const votes = this.getTicketVotes(row.id);

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

  getTicketQueue(): TicketQueueItem[] {
    const rows = this.sql
      .exec<{
        id: number;
        ticket_id: string;
        title: string | null;
        description: string | null;
        status: "pending" | "in_progress" | "completed";
        outcome: string | null;
        created_at: number;
        completed_at: number | null;
        ordinal: number;
        external_service: "jira" | "none";
        external_service_id: string | null;
        external_service_metadata: string | null;
      }>("SELECT * FROM ticket_queue ORDER BY ordinal ASC")
      .toArray();

    return rows.map((row) => {
      const votes = this.getTicketVotes(row.id);

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
              row.external_service_metadata,
            )
          : undefined,
        votes,
      };
    });
  }

  getTicketVotes(ticketQueueId: number): TicketVote[] {
    const rows = this.sql
      .exec<{
        id: number;
        ticket_queue_id: number;
        user_name: string;
        vote: string;
        structured_vote_payload: string | null;
        voted_at: number;
      }>(
        "SELECT * FROM ticket_votes WHERE ticket_queue_id = ? ORDER BY voted_at ASC",
        ticketQueueId,
      )
      .toArray();

    return rows.map((row) => ({
      id: row.id,
      ticketQueueId: row.ticket_queue_id,
      userName: row.user_name,
      vote: parseVote(row.vote),
      structuredVotePayload: row.structured_vote_payload
        ? safeJsonParse<StructuredVote>(row.structured_vote_payload)
        : undefined,
      votedAt: row.voted_at,
    }));
  }

  createTicket(
    ticket: Omit<TicketQueueItem, "id" | "createdAt" | "votes">,
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
      serializeJSON(ticket.externalServiceMetadata),
    );

    const insertedId = result.toArray()[0] as { id: number };
    const created = this.getTicketById(insertedId.id);
    if (!created) {
      throw new Error("Failed to create ticket");
    }
    return created;
  }

  updateTicket(
    id: number,
    updates: Partial<Omit<TicketQueueItem, "id" | "createdAt" | "votes">>,
  ): void {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.ticketId !== undefined) {
      fields.push("ticket_id = ?");
      values.push(updates.ticketId);
    }
    if (updates.title !== undefined) {
      fields.push("title = ?");
      values.push(updates.title ?? null);
    }
    if (updates.description !== undefined) {
      fields.push("description = ?");
      values.push(updates.description ?? null);
    }
    if (updates.status !== undefined) {
      fields.push("status = ?");
      values.push(updates.status);
    }
    if (updates.outcome !== undefined) {
      fields.push("outcome = ?");
      values.push(updates.outcome ?? null);
    }
    if (updates.completedAt !== undefined) {
      fields.push("completed_at = ?");
      values.push(updates.completedAt ?? null);
    }
    if (updates.ordinal !== undefined) {
      fields.push("ordinal = ?");
      values.push(updates.ordinal);
    }
    if (updates.externalService !== undefined) {
      fields.push("external_service = ?");
      values.push(updates.externalService);
    }
    if (updates.externalServiceId !== undefined) {
      fields.push("external_service_id = ?");
      values.push(updates.externalServiceId ?? null);
    }
    if (updates.externalServiceMetadata !== undefined) {
      fields.push("external_service_metadata = ?");
      values.push(serializeJSON(updates.externalServiceMetadata));
    }

    if (fields.length === 0) {
      return;
    }

    values.push(id);
    this.sql.exec(
      `UPDATE ticket_queue SET ${fields.join(", ")} WHERE id = ?`,
      ...values,
    );
  }

  deleteTicket(id: number): void {
    this.sql.exec("DELETE FROM ticket_queue WHERE id = ?", id);
  }

  setCurrentTicket(ticketId: number | null): void {
    this.sql.exec(
      `UPDATE room_meta SET current_ticket_id = ? WHERE id = ${ROOM_ROW_ID}`,
      ticketId,
    );
  }

  logTicketVote(
    ticketQueueId: number,
    userName: string,
    vote: string | number,
    structuredVote?: StructuredVote,
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
      Date.now(),
    );
  }

  getNextTicketId(): string {
    const maxTicket = this.sql
      .exec<{ ticket_id: string }>(
        `SELECT ticket_id FROM ticket_queue 
         WHERE ticket_id LIKE 'SPRINTJAM-%' 
         ORDER BY CAST(SUBSTR(ticket_id, 11) AS INTEGER) DESC 
         LIMIT 1`,
      )
      .toArray()[0];

    if (!maxTicket) {
      return "SPRINTJAM-001";
    }

    const match = maxTicket.ticket_id.match(/SPRINTJAM-(\d+)/);
    if (!match) {
      return "SPRINTJAM-001";
    }

    const nextNum = parseInt(match[1], 10) + 1;
    return `SPRINTJAM-${String(nextNum).padStart(3, "0")}`;
  }

  reorderQueue(ticketIds: number[]): void {
    ticketIds.forEach((id, index) => {
      this.sql.exec(
        "UPDATE ticket_queue SET ordinal = ? WHERE id = ?",
        index,
        id,
      );
    });
  }

  private getSql(txn?: DurableObjectTransaction): SqlStorage {
    if (txn && "sql" in txn) {
      return (txn as SqlEnabledTransaction).sql;
    }

    return this.sql;
  }
}
