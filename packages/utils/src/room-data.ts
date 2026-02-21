import type {
  RoomData,
  RoomGameSession,
  SessionRoundHistoryItem,
  StructuredVote,
  TicketQueueWithVotes,
  VoteValue,
  VotingCompletion,
  ExtraVoteOption,
} from "@sprintjam/types";

import { isStructuredVoteComplete } from "./structured-voting";

import { applySettingsUpdate } from "./room-settings";

export function getAnonymousUserId(
  roomData: RoomData,
  userName: string,
): string {
  const index = roomData.users.indexOf(userName);
  if (index === -1) {
    return "Anonymous";
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

  ensureRoomStatus(normalized);
  ensureConnectedUsers(normalized);
  ensureStructuredVotes(normalized);

  return normalized;
}

export function ensureRoomStatus(roomData: RoomData) {
  if (!roomData.status) {
    roomData.status = "active";
  }
  return roomData.status;
}

export function ensureConnectedUsers(
  roomData: RoomData,
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
  isConnected: boolean,
) {
  const normalizedInput = userName.trim();
  const targetName =
    findCanonicalUserName(roomData, normalizedInput) ?? normalizedInput;

  if (!targetName) {
    return;
  }

  ensureConnectedUsers(roomData);
  const isInUsers = roomData.users.includes(targetName);
  const isInSpectators = roomData.spectators?.includes(targetName) ?? false;

  if (!isInUsers && !isInSpectators) {
    roomData.users.push(targetName);
  }

  roomData.connectedUsers![targetName] = isConnected;
}

export function assignUserAvatar(
  roomData: RoomData,
  userName: string,
  avatar?: string,
) {
  if (!roomData.userAvatars) {
    roomData.userAvatars = {};
  }

  const normalizedInput = userName.trim();
  const targetName =
    findCanonicalUserName(roomData, normalizedInput) ??
    roomData.users.find(
      (user) => user.toLowerCase() === normalizedInput.toLowerCase(),
    ) ??
    normalizedInput;

  if (!avatar) {
    delete roomData.userAvatars[targetName];
    return;
  }

  roomData.userAvatars[targetName] = avatar;
}

export function sanitizeRoomData(roomData: RoomData): RoomData {
  const { passcodeHash, gameSession, ...rest } = roomData;
  return {
    ...rest,
    gameSession: sanitizeGameSession(gameSession),
  };
}

export function sanitizeGameSession(
  gameSession?: RoomGameSession,
): RoomGameSession | undefined {
  if (!gameSession) {
    return undefined;
  }

  const {
    numberTarget: _numberTarget,
    codenamesTargetIndices: _codenamesTargetIndices,
    codenamesAssassinIndex: _codenamesAssassinIndex,
    ...rest
  } = gameSession;
  return rest;
}

export const remapVotes = (
  idMap: Map<string, string>,
  votes: Record<string, VoteValue | null>,
) => {
  const mapped: Record<string, VoteValue | null> = {};
  Object.entries(votes).forEach(([user, vote]) => {
    const anon = idMap.get(user) ?? "Anonymous";
    mapped[anon] = vote;
  });
  return mapped;
};

export const remapStructuredVotes = (
  idMap: Map<string, string>,
  structured?: Record<string, StructuredVote>,
) => {
  if (!structured) return undefined;
  const mapped: Record<string, StructuredVote> = {};
  Object.entries(structured).forEach(([user, payload]) => {
    const anon = idMap.get(user) ?? "Anonymous";
    mapped[anon] = payload;
  });
  return mapped;
};

export const remapTicketVotes = (
  idMap: Map<string, string>,
  ticket?: TicketQueueWithVotes,
) => {
  if (!ticket?.votes) return ticket;
  return {
    ...ticket,
    votes: ticket.votes.map((vote) => ({
      ...vote,
      userName: idMap.get(vote.userName) ?? "Anonymous",
    })),
  };
};

export const remapRoundHistory = (
  idMap: Map<string, string>,
  roundHistory?: SessionRoundHistoryItem[],
) => {
  if (!roundHistory) {
    return roundHistory;
  }

  return roundHistory.map((entry) => ({
    ...entry,
    votes: entry.votes.map((vote) => ({
      ...vote,
      userName: idMap.get(vote.userName) ?? "Anonymous",
    })),
  }));
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
    .filter((t): t is TicketQueueWithVotes => t !== undefined);

  return sanitizeRoomData({
    ...roomData,
    votes: remapVotes(idMap, roomData.votes),
    structuredVotes: remapStructuredVotes(idMap, roomData.structuredVotes),
    currentTicket: remapTicketVotes(idMap, roomData.currentTicket),
    ticketQueue,
    roundHistory: remapRoundHistory(idMap, roomData.roundHistory),
  });
}

export function findCanonicalUserName(
  roomData: RoomData,
  candidate: string,
): string | undefined {
  const target = candidate.trim().toLowerCase();

  const foundInUsers = roomData.users.find(
    (user) => user.toLowerCase() === target,
  );
  if (foundInUsers) return foundInUsers;

  const foundInSpectators = roomData.spectators?.find(
    (user) => user.toLowerCase() === target,
  );
  return foundInSpectators ?? undefined;
}

const normalizeVoteValue = (value: string | number) =>
  String(value).trim().toLowerCase();

const getEnabledExtraVoteOptions = (
  options: ExtraVoteOption[] = [],
): ExtraVoteOption[] => options.filter((option) => option.enabled !== false);

const buildExtraVoteValueSet = (
  options: ExtraVoteOption[] = [],
): Set<string> => {
  const values = new Set<string>();
  getEnabledExtraVoteOptions(options).forEach((option) => {
    values.add(normalizeVoteValue(option.value));
    option.aliases?.forEach((alias) => values.add(normalizeVoteValue(alias)));
  });
  return values;
};

export function calculateVotingCompletion(
  roomData: RoomData,
): VotingCompletion {
  const totalCount = roomData.users.length;
  const extraVoteValues = buildExtraVoteValueSet(
    roomData.settings.extraVoteOptions ?? [],
  );

  const incompleteUsers: string[] = [];
  let completedCount = 0;

  for (const userName of roomData.users) {
    const userVote = roomData.votes[userName];

    if (userVote === null || userVote === undefined) {
      incompleteUsers.push(userName);
      continue;
    }

    if (roomData.settings.enableStructuredVoting) {
      if (extraVoteValues.has(normalizeVoteValue(userVote))) {
        completedCount++;
        continue;
      }

      const structuredVote = roomData.structuredVotes?.[userName];
      if (!structuredVote) {
        incompleteUsers.push(userName);
        continue;
      }

      const isComplete = isStructuredVoteComplete(
        structuredVote.criteriaScores,
        roomData.settings.votingCriteria,
      );

      if (isComplete) {
        completedCount++;
      } else {
        incompleteUsers.push(userName);
      }
    } else {
      completedCount++;
    }
  }

  const allVotesComplete = completedCount === totalCount && totalCount > 0;

  const shouldIncludeUserNames =
    !roomData.settings.anonymousVotes &&
    !roomData.settings.hideParticipantNames;

  return {
    allVotesComplete,
    completedCount,
    totalCount,
    incompleteUsers: shouldIncludeUserNames ? incompleteUsers : undefined,
  };
}
