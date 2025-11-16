import { RoomData, WebSocketMessage } from '../types';

export function applyRoomUpdate(
  prev: RoomData | null,
  message: WebSocketMessage
): RoomData | null {
  if (message.type === 'initialize') {
    return message.roomData ?? prev;
  }

  if (!prev) {
    return prev;
  }

  switch (message.type) {
    case 'userJoined': {
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

    case 'userConnectionStatus': {
      const user = message.user;
      if (!user || typeof message.isConnected !== 'boolean') return prev;

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

    case 'newModerator': {
      if (!message.moderator || message.moderator === prev.moderator) {
        return prev;
      }
      return {
        ...prev,
        moderator: message.moderator,
      };
    }

    case 'vote': {
      const user = message.user;
      if (!user || message.vote === undefined) return prev;

      const existingVote = prev.votes[user];
      const votes =
        existingVote === message.vote
          ? prev.votes
          : { ...prev.votes, [user]: message.vote };

      let structuredVotes = prev.structuredVotes;
      let structuredChanged = false;
      if (Object.prototype.hasOwnProperty.call(message, 'structuredVote')) {
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

      if (votes === prev.votes && !structuredChanged) {
        return prev;
      }

      return {
        ...prev,
        votes,
        structuredVotes,
      };
    }

    case 'showVotes': {
      if (
        typeof message.showVotes !== 'boolean' ||
        message.showVotes === prev.showVotes
      ) {
        return prev;
      }
      return {
        ...prev,
        showVotes: message.showVotes,
      };
    }

    case 'resetVotes': {
      return {
        ...prev,
        votes: {},
        structuredVotes: undefined,
        showVotes: false,
        judgeScore: null,
        judgeMetadata: undefined,
      };
    }

    case 'settingsUpdated': {
      if (!message.settings) {
        return prev;
      }
      return {
        ...prev,
        settings: message.settings,
      };
    }

    case 'judgeScoreUpdated': {
      const newScore = message.judgeScore ?? null;
      const newMetadata = message.judgeMetadata ?? undefined;
      return {
        ...prev,
        judgeScore: newScore,
        judgeMetadata: newMetadata,
      };
    }

    case 'jiraTicketUpdated': {
      if (!Object.prototype.hasOwnProperty.call(message, 'ticket')) {
        return prev;
      }

      if (message.ticket === undefined) {
        if (prev.jiraTicket === undefined) {
          return prev;
        }
        const updated = { ...prev };
        delete updated.jiraTicket;
        return updated;
      }

      return {
        ...prev,
        jiraTicket: message.ticket,
      };
    }

    case 'jiraTicketCleared': {
      if (prev.jiraTicket === undefined) {
        return prev;
      }
      const updated = { ...prev };
      delete updated.jiraTicket;
      return updated;
    }

    case 'strudelCodeGenerated': {
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

    default:
      return prev;
  }
}
