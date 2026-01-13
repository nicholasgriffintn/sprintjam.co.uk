import type { RoomData, TicketQueueWithVotes } from '@sprintjam/types';
import { postRoundStats, generateID } from '@sprintjam/utils';

import type { PlanningRoom } from '.';

export function shouldAnonymizeVotes(roomData: RoomData): boolean {
  return (
    roomData.settings.anonymousVotes ||
    roomData.settings.hideParticipantNames ||
    false
  );
}

export function getQueueWithPrivacy(
  room: PlanningRoom,
  roomData: RoomData
): TicketQueueWithVotes[] {
  return room.repository.getTicketQueue({
    anonymizeVotes: shouldAnonymizeVotes(roomData),
  });
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
  roomData: RoomData
) {
  if (!ticket || Object.keys(roomData.votes).length === 0) {
    return;
  }

  Object.entries(roomData.votes).forEach(([user, vote]) => {
    room.repository.logTicketVote(
      ticket.id,
      user,
      vote,
      roomData.structuredVotes?.[user]
    );
  });
}

export function promoteNextPendingTicket(
  room: PlanningRoom,
  roomData: RoomData,
  queue?: TicketQueueWithVotes[]
): TicketQueueWithVotes | null {
  const workingQueue = queue ?? getQueueWithPrivacy(room, roomData);
  const pendingTicket = workingQueue.find((t) => t.status === 'pending');

  if (!pendingTicket) {
    return null;
  }

  room.repository.updateTicket(pendingTicket.id, { status: 'in_progress' });
  const refreshed = room.repository.getTicketById(pendingTicket.id, {
    anonymizeVotes: shouldAnonymizeVotes(roomData),
  });

  return refreshed ?? null;
}

function canAutoCreateTicket(roomData: RoomData): boolean {
  return roomData.settings.externalService === 'none';
}

export function createAutoTicket(
  room: PlanningRoom,
  roomData: RoomData,
  queue: TicketQueueWithVotes[]
): TicketQueueWithVotes | null {
  if (!canAutoCreateTicket(roomData)) {
    return null;
  }

  const ticketId = room.repository.getNextTicketId({
    externalService: roomData.settings.externalService || 'none',
  });

  if (!ticketId) {
    return null;
  }

  const maxOrdinal = Math.max(0, ...queue.map((t) => t.ordinal));
  return room.repository.createTicket({
    ticketId,
    status: 'in_progress',
    ordinal: maxOrdinal + 1,
    externalService: roomData.settings.externalService || 'none',
  });
}

export async function readRoomData(
  room: PlanningRoom
): Promise<RoomData | undefined> {
  const roomData = await room.repository.getRoomData();
  if (!roomData) {
    return undefined;
  }

  return roomData;
}

export async function postRoundToStats(
  room: PlanningRoom,
  roomData: RoomData,
  ticketId?: string
): Promise<void> {
  if (Object.keys(roomData.votes).length === 0) return;

  const roundId = generateID();
  const now = Date.now();

  const votes = Object.entries(roomData.votes).map(([user, vote]) => ({
    userName: user,
    vote: String(vote),
    structuredVote: roomData.structuredVotes?.[user],
    votedAt: now,
  }));

  await postRoundStats(room.env.STATS_WORKER, room.env.STATS_INGEST_TOKEN, {
    roomKey: roomData.key,
    roundId,
    ticketId,
    votes,
    judgeScore: roomData.judgeScore ? String(roomData.judgeScore) : undefined,
    judgeMetadata: roomData.judgeMetadata,
    roundEndedAt: now,
  });
}
