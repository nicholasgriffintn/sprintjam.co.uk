import type {
  DurableObjectStorage,
  DurableObjectTransaction,
  SqlStorage,
} from '@cloudflare/workers-types';

import type {
  JiraTicket,
  RoomData,
  RoomSettings,
  StructuredVote,
} from '../types';
import { serializeJSON, serializeVote } from '../utils/serialize';
import { parseJudgeScore, parseVote } from '../utils/parse';

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
          strudel_is_playing INTEGER NOT NULL DEFAULT 0
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
          vote TEXT NOT NULL
        )`
      );

      this.sql.exec(
        `CREATE TABLE IF NOT EXISTS room_structured_votes (
          user_name TEXT PRIMARY KEY,
          payload TEXT NOT NULL
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
        passcode: string | null;
        judge_score: string | null;
        judge_metadata: string | null;
        jira_ticket: string | null;
        settings: string;
        current_strudel_code: string | null;
        current_strudel_generation_id: string | null;
        strudel_phase: string | null;
        strudel_is_playing: number | null;
      }>(`SELECT * FROM room_meta WHERE id = ${ROOM_ROW_ID}`)
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
      .exec<{ user_name: string; vote: string }>('SELECT * FROM room_votes')
      .toArray();

    const structuredVotes = this.sql
      .exec<{ user_name: string; payload: string }>(
        'SELECT * FROM room_structured_votes'
      )
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
        structuredVoteMap[entry.user_name] = JSON.parse(
          entry.payload
        ) as StructuredVote;
      } catch {
        // Ignore malformed rows to avoid breaking the room load.
      }
    }

    let settings: RoomSettings;
    try {
      settings = JSON.parse(row.settings) as RoomSettings;
    } catch {
      throw new Error('Failed to parse room settings from storage');
    }

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
        ? (JSON.parse(row.judge_metadata) as Record<string, unknown>)
        : undefined,
      jiraTicket: row.jira_ticket
        ? (JSON.parse(row.jira_ticket) as JiraTicket)
        : undefined,
      settings,
      passcode: row.passcode ?? undefined,
      userAvatars:
        Object.keys(userAvatars).length > 0 ? userAvatars : undefined,
      currentStrudelCode: row.current_strudel_code ?? undefined,
      currentStrudelGenerationId:
        row.current_strudel_generation_id ?? undefined,
      strudelPhase: row.strudel_phase ?? undefined,
      strudelIsPlaying: row.strudel_is_playing
        ? !!row.strudel_is_playing
        : undefined,
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
          jira_ticket,
          settings,
          current_strudel_code,
          current_strudel_generation_id,
          strudel_phase,
          strudel_is_playing
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          room_key = excluded.room_key,
          moderator = excluded.moderator,
          show_votes = excluded.show_votes,
          passcode = excluded.passcode,
          judge_score = excluded.judge_score,
          judge_metadata = excluded.judge_metadata,
          jira_ticket = excluded.jira_ticket,
          settings = excluded.settings,
          current_strudel_code = excluded.current_strudel_code,
          current_strudel_generation_id = excluded.current_strudel_generation_id,
          strudel_phase = excluded.strudel_phase,
          strudel_is_playing = excluded.strudel_is_playing`,
        ROOM_ROW_ID,
        roomData.key,
        roomData.moderator,
        roomData.showVotes ? 1 : 0,
        roomData.passcode ?? null,
        roomData.judgeScore === undefined || roomData.judgeScore === null
          ? null
          : String(roomData.judgeScore),
        serializeJSON(roomData.judgeMetadata),
        serializeJSON(roomData.jiraTicket),
        JSON.stringify(roomData.settings),
        roomData.currentStrudelCode ?? null,
        roomData.currentStrudelGenerationId ?? null,
        roomData.strudelPhase ?? null,
        roomData.strudelIsPlaying ? 1 : 0
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
        sql.exec(
          `INSERT INTO room_votes (user_name, vote) VALUES (?, ?)`,
          user,
          serializeVote(vote)
        );
      });

      sql.exec('DELETE FROM room_structured_votes');
      if (roomData.structuredVotes) {
        Object.entries(roomData.structuredVotes).forEach(([user, payload]) => {
          sql.exec(
            `INSERT INTO room_structured_votes (user_name, payload)
             VALUES (?, ?)`,
            user,
            JSON.stringify(payload)
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
      userName
    );
  }

  setUserConnection(userName: string, isConnected: boolean) {
    this.ensureUser(userName);
    this.sql.exec(
      `UPDATE room_users SET is_connected = ? WHERE user_name = ?`,
      isConnected ? 1 : 0,
      userName
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
      userName
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

  setVote(userName: string, vote: string | number) {
    this.ensureUser(userName);
    this.sql.exec(
      `INSERT INTO room_votes (user_name, vote)
       VALUES (?, ?)
       ON CONFLICT(user_name) DO UPDATE SET vote = excluded.vote`,
      userName,
      serializeVote(vote)
    );
  }

  clearVotes() {
    this.sql.exec('DELETE FROM room_votes');
  }

  setStructuredVote(userName: string, vote: StructuredVote) {
    this.ensureUser(userName);
    this.sql.exec(
      `INSERT INTO room_structured_votes (user_name, payload)
       VALUES (?, ?)
       ON CONFLICT(user_name) DO UPDATE SET payload = excluded.payload`,
      userName,
      JSON.stringify(vote)
    );
  }

  clearStructuredVotes() {
    this.sql.exec('DELETE FROM room_structured_votes');
  }

  setJudgeState(
    score: string | number | null,
    metadata?: Record<string, unknown>
  ) {
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

  setJiraTicket(ticket?: JiraTicket) {
    this.sql.exec(
      `UPDATE room_meta SET jira_ticket = ? WHERE id = ${ROOM_ROW_ID}`,
      serializeJSON(ticket)
    );
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

  private getSql(txn?: DurableObjectTransaction): SqlStorage {
    if (txn && 'sql' in txn) {
      return (txn as SqlEnabledTransaction).sql;
    }

    return this.sql;
  }
}
