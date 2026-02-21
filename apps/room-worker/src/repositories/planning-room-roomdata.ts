import { eq } from "drizzle-orm";

import {
  roomMeta,
  roomUsers,
  roomVotes,
} from "@sprintjam/db/durable-objects/schemas";
import type { DB, InsertRoomMetaItem } from "@sprintjam/db";
import type {
  JudgeMetadata,
  RoomData,
  RoomGameSession,
  RoomSettings,
  SessionRoundHistoryItem,
  StructuredVote,
} from "@sprintjam/types";
import {
  parseJudgeScore,
  parsePasscodeHash,
  parseVote,
  safeJsonParse,
  serializeJSON,
  serializePasscodeHash,
  serializeVote,
} from "@sprintjam/utils";
import {
  DEFAULT_TIMER_DURATION_SECONDS,
  ROOM_ROW_ID,
} from "@sprintjam/utils/constants";

interface TicketQueueReader {
  getCurrentTicket(options?: {
    anonymizeVotes?: boolean;
    roomKey?: string;
  }): RoomData["currentTicket"];
  getTicketQueue(options?: {
    anonymizeVotes?: boolean;
    roomKey?: string;
  }): NonNullable<RoomData["ticketQueue"]>;
}

export class PlanningRoomRoomDataStore {
  constructor(
    private readonly db: DB,
    private readonly ticketStore: TicketQueueReader,
  ) {}

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

    const currentTicket = this.ticketStore.getCurrentTicket({
      anonymizeVotes,
      roomKey: row.roomKey,
    });
    const ticketQueue = this.ticketStore.getTicketQueue({
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
}
