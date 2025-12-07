import type {
  RoomData,
  StructuredVote,
  VoteValue,
  TicketQueueItem,
  CodenamesState,
} from '../types';
import { applySettingsUpdate } from './room-settings';

export function redactCodenamesState(
  state?: CodenamesState
): CodenamesState | undefined {
  if (!state) {
    return state;
  }
  const { assignments, ...rest } = state;
  return { ...rest, assignments: undefined };
}

function redactGameStates(gameStates?: Record<string, unknown>) {
  if (!gameStates) {
    return gameStates;
  }
  const copy = { ...gameStates };
  if (copy.codenames) {
    copy.codenames = redactCodenamesState(
      copy.codenames as CodenamesState | undefined
    );
  }
  return copy;
}

export function getAnonymousUserId(
  roomData: RoomData,
  userName: string
): string {
  const index = roomData.users.indexOf(userName);
  if (index === -1) {
    return 'Anonymous';
  }
  return `Anonymous ${index + 1}`;
}

export function normalizeRoomData(roomData: RoomData): RoomData {
  const normalized: RoomData = {
    ...roomData,
    settings: applySettingsUpdate({
      currentSettings: roomData.settings,
    }),
  };

  ensureConnectedUsers(normalized);
  ensureStructuredVotes(normalized);

  return normalized;
}

export function ensureConnectedUsers(
  roomData: RoomData
): Record<string, boolean> {
  if (!roomData.connectedUsers) {
    roomData.connectedUsers = {};
    for (const user of roomData.users) {
      roomData.connectedUsers[user] = false;
    }
  }

  return roomData.connectedUsers;
}

export function ensureStructuredVotes(roomData: RoomData) {
  if (!roomData.structuredVotes) {
    roomData.structuredVotes = {};
  }
  return roomData.structuredVotes;
}

export function markUserConnection(
  roomData: RoomData,
  userName: string,
  isConnected: boolean
) {
  const normalizedInput = userName.trim();
  const targetName =
    findCanonicalUserName(roomData, normalizedInput) ?? normalizedInput;

  if (!targetName) {
    return;
  }

  ensureConnectedUsers(roomData);
  if (!roomData.users.includes(targetName)) {
    roomData.users.push(targetName);
  }

  roomData.connectedUsers![targetName] = isConnected;
}

export function assignUserAvatar(
  roomData: RoomData,
  userName: string,
  avatar?: string
) {
  if (!roomData.userAvatars) {
    roomData.userAvatars = {};
  }

  const normalizedInput = userName.trim();
  const targetName =
    findCanonicalUserName(roomData, normalizedInput) ??
    roomData.users.find(
      (user) => user.toLowerCase() === normalizedInput.toLowerCase()
    ) ??
    normalizedInput;

  if (!avatar) {
    delete roomData.userAvatars[targetName];
    return;
  }

  roomData.userAvatars[targetName] = avatar;
}

export function sanitizeRoomData(roomData: RoomData): RoomData {
  const { passcodeHash, ...rest } = roomData;
  const gameStates = redactGameStates(rest.gameStates);
  return {
    ...rest,
    gameStates,
  };
}

export const remapVotes = (
  idMap: Map<string, string>,
  votes: Record<string, VoteValue | null>
) => {
  const mapped: Record<string, VoteValue | null> = {};
  Object.entries(votes).forEach(([user, vote]) => {
    const anon = idMap.get(user) ?? 'Anonymous';
    mapped[anon] = vote;
  });
  return mapped;
};

export const remapStructuredVotes = (
  idMap: Map<string, string>,
  structured?: Record<string, StructuredVote>
) => {
  if (!structured) return undefined;
  const mapped: Record<string, StructuredVote> = {};
  Object.entries(structured).forEach(([user, payload]) => {
    const anon = idMap.get(user) ?? 'Anonymous';
    mapped[anon] = payload;
  });
  return mapped;
};

export const remapTicketVotes = (
  idMap: Map<string, string>,
  ticket?: TicketQueueItem
) => {
  if (!ticket?.votes) return ticket;
  return {
    ...ticket,
    votes: ticket.votes.map((vote) => ({
      ...vote,
      userName: idMap.get(vote.userName) ?? 'Anonymous',
    })),
  };
};

export function anonymizeRoomData(roomData: RoomData): RoomData {
  if (
    !roomData.settings.anonymousVotes &&
    !roomData.settings.hideParticipantNames
  ) {
    return sanitizeRoomData(roomData);
  }

  const idMap = new Map<string, string>();
  roomData.users.forEach((user) => {
    idMap.set(user, getAnonymousUserId(roomData, user));
  });

  const ticketQueue = roomData.ticketQueue
    ?.map((t) => remapTicketVotes(idMap, t))
    .filter((t): t is TicketQueueItem => t !== undefined);

  return sanitizeRoomData({
    ...roomData,
    votes: remapVotes(idMap, roomData.votes),
    structuredVotes: remapStructuredVotes(idMap, roomData.structuredVotes),
    currentTicket: remapTicketVotes(idMap, roomData.currentTicket),
    ticketQueue,
  });
}

export function findCanonicalUserName(
  roomData: RoomData,
  candidate: string
): string | undefined {
  const target = candidate.trim().toLowerCase();
  return (
    roomData.users.find((user) => user.toLowerCase() === target) ?? undefined
  );
}
