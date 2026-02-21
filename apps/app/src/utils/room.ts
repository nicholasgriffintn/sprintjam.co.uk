import { RoomData, WebSocketMessage, TicketQueueItem } from "../types";

export const getAnonymousUserId = (
  roomData: RoomData,
  userName: string,
): string => {
  const index = roomData.users.indexOf(userName);
  if (index === -1) {
    return "Anonymous";
  }
  return `Anonymous ${index + 1}`;
};

export const getVoteKeyForUser = (
  roomData: RoomData,
  userName: string,
): string => {
  if (roomData.settings.anonymousVotes) {
    return getAnonymousUserId(roomData, userName);
  }
  return userName;
};

export function applyRoomUpdate(
  prev: RoomData | null,
  message: WebSocketMessage,
): RoomData | null {
  if (message.type === "initialize") {
    return message.roomData ?? prev;
  }

  if (!prev) {
    return prev;
  }

  switch (message.type) {
    case "userJoined": {
      const user = message.user;
      if (!user) return prev;

      const alreadyPresent = prev.users.includes(user);
      const alreadyConnected = prev.connectedUsers[user] === true;

      if (alreadyPresent && alreadyConnected) {
        return prev;
      }

      const users = alreadyPresent ? prev.users : [...prev.users, user];
      const connectedUsers = alreadyConnected
        ? prev.connectedUsers
        : { ...prev.connectedUsers, [user]: true };

      let userAvatars = prev.userAvatars;
      if (message.avatar && (!userAvatars || !userAvatars[user])) {
        userAvatars = {
          ...(userAvatars ?? {}),
          [user]: message.avatar,
        };
      }

      return {
        ...prev,
        users,
        connectedUsers,
        userAvatars,
      };
    }

    case "userConnectionStatus": {
      const user = message.user;
      if (!user || typeof message.isConnected !== "boolean") return prev;

      if (prev.connectedUsers[user] === message.isConnected) {
        return prev;
      }

      return {
        ...prev,
        connectedUsers: {
          ...prev.connectedUsers,
          [user]: message.isConnected,
        },
      };
    }

    case "spectatorStatusChanged": {
      const { user, isSpectator, users, spectators } = message;
      if (!user || typeof isSpectator !== "boolean") return prev;

      const updatedVotes = { ...prev.votes };
      let updatedStructuredVotes = prev.structuredVotes;

      if (isSpectator) {
        delete updatedVotes[user];
        if (updatedStructuredVotes && updatedStructuredVotes[user]) {
          const newStructuredVotes = { ...updatedStructuredVotes };
          delete newStructuredVotes[user];
          updatedStructuredVotes =
            Object.keys(newStructuredVotes).length > 0
              ? newStructuredVotes
              : undefined;
        }
      }

      return {
        ...prev,
        users: users ?? prev.users,
        spectators:
          spectators && spectators.length > 0 ? spectators : undefined,
        votes: updatedVotes,
        structuredVotes: updatedStructuredVotes,
      };
    }

    case "newModerator": {
      if (!message.moderator || message.moderator === prev.moderator) {
        return prev;
      }
      return {
        ...prev,
        moderator: message.moderator,
      };
    }

    case "vote": {
      const user = message.user;
      if (!user || message.vote === undefined) return prev;

      const existingVote = prev.votes[user];
      const votes =
        existingVote === message.vote
          ? prev.votes
          : { ...prev.votes, [user]: message.vote };

      let structuredVotes = prev.structuredVotes;
      let structuredChanged = false;
      if (Object.prototype.hasOwnProperty.call(message, "structuredVote")) {
        if (message.structuredVote) {
          structuredVotes = {
            ...(prev.structuredVotes ?? {}),
            [user]: message.structuredVote,
          };
          structuredChanged = true;
        } else if (prev.structuredVotes && prev.structuredVotes[user]) {
          const updatedVotes = { ...prev.structuredVotes };
          delete updatedVotes[user];
          structuredVotes =
            Object.keys(updatedVotes).length > 0 ? updatedVotes : undefined;
          structuredChanged = true;
        }
      }

      const votingCompletion =
        message.votingCompletion ?? prev.votingCompletion;

      if (
        votes === prev.votes &&
        !structuredChanged &&
        votingCompletion === prev.votingCompletion
      ) {
        return prev;
      }

      return {
        ...prev,
        votes,
        structuredVotes,
        votingCompletion,
      };
    }

    case "showVotes": {
      if (
        typeof message.showVotes !== "boolean" ||
        message.showVotes === prev.showVotes
      ) {
        return prev;
      }
      return {
        ...prev,
        showVotes: message.showVotes,
      };
    }

    case "resetVotes": {
      const shouldKeepRevealed = prev.settings.alwaysRevealVotes ?? false;
      return {
        ...prev,
        votes: {},
        structuredVotes: undefined,
        showVotes: shouldKeepRevealed,
        judgeScore: null,
        judgeMetadata: undefined,
        votingCompletion: message.votingCompletion,
      };
    }

    case "ticketCompleted": {
      const shouldKeepRevealed = prev.settings.alwaysRevealVotes ?? false;
      return {
        ...prev,
        votes: {},
        structuredVotes: undefined,
        showVotes: shouldKeepRevealed,
        judgeScore: null,
        judgeMetadata: undefined,
        currentTicket: message.ticket as TicketQueueItem | undefined,
        ticketQueue: message.queue,
      };
    }

    case "settingsUpdated": {
      if (!message.settings) {
        return prev;
      }
      return {
        ...prev,
        settings: message.settings,
      };
    }

    case "roomStatusUpdated": {
      if (!message.status || message.status === prev.status) {
        return prev;
      }
      return {
        ...prev,
        status: message.status,
      };
    }

    case "judgeScoreUpdated": {
      const newScore = message.judgeScore ?? null;
      const newMetadata = message.judgeMetadata ?? undefined;
      return {
        ...prev,
        judgeScore: newScore,
        judgeMetadata: newMetadata,
      };
    }

    case "strudelCodeGenerated": {
      if (!message.code) {
        return prev;
      }
      return {
        ...prev,
        currentStrudelCode: message.code,
        currentStrudelGenerationId: message.generationId,
        strudelPhase: message.phase,
      };
    }

    case "strudelPlaybackToggled": {
      if (typeof message.isPlaying !== "boolean") {
        return prev;
      }
      if (prev.strudelIsPlaying === message.isPlaying) {
        return prev;
      }
      return {
        ...prev,
        strudelIsPlaying: message.isPlaying,
      };
    }

    case "nextTicket": {
      const shouldKeepRevealed = prev.settings.alwaysRevealVotes ?? false;
      return {
        ...prev,
        votes: {},
        structuredVotes: undefined,
        showVotes: shouldKeepRevealed,
        judgeScore: null,
        judgeMetadata: undefined,
        currentTicket: message.ticket as TicketQueueItem,
        ticketQueue: message.queue,
      };
    }

    case "ticketAdded":
    case "ticketUpdated":
    case "ticketDeleted":
    case "queueUpdated": {
      let currentTicket = prev.currentTicket;
      if (
        "ticket" in message &&
        message.ticket &&
        currentTicket &&
        message.ticket.id === currentTicket.id
      ) {
        currentTicket = message.ticket;
      }

      if (
        message.type === "ticketDeleted" &&
        prev.currentTicket &&
        message.ticketId === prev.currentTicket.id
      ) {
        return {
          ...prev,
          ticketQueue: message.queue,
        };
      }

      return {
        ...prev,
        currentTicket,
        ticketQueue: message.queue,
      };
    }

    case "gameStarted":
    case "gameMoveSubmitted": {
      if (!message.gameSession) {
        return prev;
      }

      const existingKnownBlockerIndex =
        prev.gameSession?.type === "clueboard" &&
        message.gameSession.type === "clueboard" &&
        prev.gameSession.round === message.gameSession.round
          ? prev.gameSession.codenamesKnownBlockerIndex
          : undefined;

      return {
        ...prev,
        gameSession:
          existingKnownBlockerIndex === undefined
            ? message.gameSession
            : {
                ...message.gameSession,
                codenamesKnownBlockerIndex: existingKnownBlockerIndex,
              },
      };
    }

    case "gameEnded": {
      return {
        ...prev,
        gameSession: message.gameSession,
      };
    }

    case "clueboardSecret": {
      if (
        !prev.gameSession ||
        prev.gameSession.type !== "clueboard" ||
        prev.gameSession.round !== message.round
      ) {
        return prev;
      }

      if (
        prev.gameSession.codenamesKnownBlockerIndex === message.blockerIndex
      ) {
        return prev;
      }

      return {
        ...prev,
        gameSession: {
          ...prev.gameSession,
          codenamesKnownBlockerIndex: message.blockerIndex,
        },
      };
    }

    case "timerStarted":
    case "timerPaused":
    case "timerReset":
    case "timerUpdated": {
      if (!message.timerState) {
        return prev;
      }
      return {
        ...prev,
        timerState: message.timerState,
      };
    }

    default:
      return prev;
  }
}
