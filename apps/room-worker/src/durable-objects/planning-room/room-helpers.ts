import type {
  RoomData,
  RoundTransitionType,
  SessionRoundHistoryItem,
  SessionRoundVote,
  TicketQueueWithVotes,
} from "@sprintjam/types";
import {
  getAnonymousUserId,
  postRoundStats,
  generateID,
  remapRoundHistory,
} from "@sprintjam/utils";

import type { PlanningRoom } from ".";

export function shouldAnonymizeVotes(roomData: RoomData): boolean {
  return (
    roomData.settings.anonymousVotes ||
    roomData.settings.hideParticipantNames ||
    false
  );
}

export function getQueueWithPrivacy(
  room: PlanningRoom,
  roomData: RoomData,
): TicketQueueWithVotes[] {
  return room.repository.getTicketQueue({
    anonymizeVotes: shouldAnonymizeVotes(roomData),
  });
}

export function getRoundHistoryWithPrivacy(
  roomData: RoomData,
): SessionRoundHistoryItem[] | undefined {
  if (!roomData.roundHistory?.length) {
    return undefined;
  }

  if (!shouldAnonymizeVotes(roomData)) {
    return roomData.roundHistory;
  }

  const idMap = new Map<string, string>();
  roomData.users.forEach((user) => {
    idMap.set(user, getAnonymousUserId(roomData, user));
  });

  return remapRoundHistory(idMap, roomData.roundHistory);
}

export function resetVotingState(room: PlanningRoom, roomData: RoomData) {
  roomData.votes = {};
  roomData.structuredVotes = {};
  const shouldKeepRevealed = roomData.settings.alwaysRevealVotes || false;
  roomData.showVotes = shouldKeepRevealed;
  roomData.judgeScore = null;
  roomData.judgeMetadata = undefined;

  room.repository.clearVotes();
  room.repository.clearStructuredVotes();
  room.repository.setShowVotes(shouldKeepRevealed);
  room.repository.setJudgeState(null);
}

export function logVotesForTicket(
  room: PlanningRoom,
  ticket: TicketQueueWithVotes | undefined | null,
  roomData: RoomData,
) {
  if (!ticket || Object.keys(roomData.votes).length === 0) {
    return;
  }

  Object.entries(roomData.votes).forEach(([user, vote]) => {
    room.repository.logTicketVote(
      ticket.id,
      user,
      vote,
      roomData.structuredVotes?.[user],
    );
  });
}

export function promoteNextPendingTicket(
  room: PlanningRoom,
  roomData: RoomData,
  queue?: TicketQueueWithVotes[],
): TicketQueueWithVotes | null {
  const workingQueue = queue ?? getQueueWithPrivacy(room, roomData);
  const pendingTicket = workingQueue.find((t) => t.status === "pending");

  if (!pendingTicket) {
    return null;
  }

  room.repository.updateTicket(pendingTicket.id, { status: "in_progress" });
  const refreshed = room.repository.getTicketById(pendingTicket.id, {
    anonymizeVotes: shouldAnonymizeVotes(roomData),
  });

  return refreshed ?? null;
}

function canAutoCreateTicket(roomData: RoomData): boolean {
  return roomData.settings.externalService === "none";
}

export function createAutoTicket(
  room: PlanningRoom,
  roomData: RoomData,
  queue: TicketQueueWithVotes[],
): TicketQueueWithVotes | null {
  if (!canAutoCreateTicket(roomData)) {
    return null;
  }

  const ticketId = room.repository.getNextTicketId({
    externalService: roomData.settings.externalService || "none",
  });

  if (!ticketId) {
    return null;
  }

  const maxOrdinal = Math.max(0, ...queue.map((t) => t.ordinal));
  return room.repository.createTicket({
    ticketId,
    status: "in_progress",
    ordinal: maxOrdinal + 1,
    externalService: roomData.settings.externalService || "none",
  });
}

export async function readRoomData(
  room: PlanningRoom,
): Promise<RoomData | undefined> {
  const roomData = await room.repository.getRoomData();
  if (!roomData) {
    return undefined;
  }

  return roomData;
}

const MAX_ROUND_HISTORY_ENTRIES = 200;

const buildRoundVotes = (
  roomData: RoomData,
  votedAt: number,
): SessionRoundVote[] =>
  Object.entries(roomData.votes).reduce<SessionRoundVote[]>(
    (acc, [userName, vote]) => {
      if (vote === null || vote === undefined) {
        return acc;
      }
      acc.push({
        userName,
        vote,
        structuredVotePayload: roomData.structuredVotes?.[userName],
        votedAt,
      });
      return acc;
    },
    [],
  );

export function appendRoundHistory(
  room: PlanningRoom,
  roomData: RoomData,
  options: {
    type: RoundTransitionType;
    ticket?: TicketQueueWithVotes | null;
    endedAt?: number;
  },
): SessionRoundHistoryItem | null {
  if (Object.keys(roomData.votes).length === 0) {
    return null;
  }

  const endedAt = options.endedAt ?? Date.now();
  const entry: SessionRoundHistoryItem = {
    id: generateID(),
    ticketId: options.ticket?.ticketId,
    ticketTitle: options.ticket?.title || undefined,
    outcome: options.ticket?.outcome || undefined,
    type: options.type,
    endedAt,
    votes: buildRoundVotes(roomData, endedAt),
  };

  const updatedHistory = [...(roomData.roundHistory ?? []), entry].slice(
    -MAX_ROUND_HISTORY_ENTRIES,
  );
  roomData.roundHistory = updatedHistory;
  room.repository.setRoundHistory(updatedHistory);

  return entry;
}

export async function postRoundToStats(
  room: PlanningRoom,
  roomData: RoomData,
  ticketId?: string,
  type: "reset" | "next_ticket" = "reset",
  options?: {
    roundId?: string;
    roundEndedAt?: number;
    votes?: SessionRoundVote[];
  },
): Promise<void> {
  const now = options?.roundEndedAt ?? Date.now();
  const roundId = options?.roundId ?? generateID();
  const roundVotes = options?.votes ?? buildRoundVotes(roomData, now);
  if (roundVotes.length === 0) return;

  const votes = roundVotes.map((vote) => ({
    userName: vote.userName,
    vote: String(vote.vote),
    structuredVote: vote.structuredVotePayload,
    votedAt: vote.votedAt,
  }));

  await postRoundStats(room.env.STATS_WORKER, room.env.STATS_INGEST_TOKEN, {
    roomKey: roomData.key,
    roundId,
    ticketId,
    votes,
    judgeScore:
      roomData.judgeScore === null || roomData.judgeScore === undefined
        ? undefined
        : String(roomData.judgeScore),
    judgeMetadata: roomData.judgeMetadata,
    roundEndedAt: now,
    type,
  });
}
