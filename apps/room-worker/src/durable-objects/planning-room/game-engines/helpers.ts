import type { RoomData, RoomGameSession, RoomGameType } from "@sprintjam/types";

import type { GameEngine } from "./types";

export const MAX_GAME_ROUNDS = 5;
export const ROUND_MOVE_TARGET = 6;
export const GUESS_ROUND_ATTEMPT_LIMIT = 10;
const MAX_EMOJI_STORY_MOVE_EMOJIS = 6;
const EMOJI_TOKEN_PATTERN =
  /(?:\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*|\p{Regional_Indicator}{2}|[0-9#*]\uFE0F?\u20E3)/gu;

export const createNumberTarget = () => Math.floor(Math.random() * 20) + 1;

export const createGameEvent = (message: string) => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  message,
  createdAt: Date.now(),
});

export const createGameMove = (
  session: RoomGameSession,
  userName: string,
  value: string,
) => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  user: userName,
  submittedAt: Date.now(),
  value,
  round: session.round,
});

export const addPoints = (
  session: RoomGameSession,
  userName: string,
  points: number,
) => {
  session.leaderboard[userName] = (session.leaderboard[userName] ?? 0) + points;
};

export const addEvent = (session: RoomGameSession, message: string) => {
  session.events = [...session.events.slice(-9), createGameEvent(message)];
};

export const getCurrentRoundMoveCount = (session: RoomGameSession) =>
  session.moves.filter((gameMove) => gameMove.round === session.round).length;

export const isValidEmojiStoryMove = (value: string) => {
  const compactValue = value.replace(/\s+/g, "");
  if (!compactValue) {
    return false;
  }

  const emojiTokens = compactValue.match(EMOJI_TOKEN_PATTERN) ?? [];
  if (
    emojiTokens.length === 0 ||
    emojiTokens.length > MAX_EMOJI_STORY_MOVE_EMOJIS
  ) {
    return false;
  }

  return emojiTokens.join("") === compactValue;
};

export const initializeGameSession = (
  roomData: RoomData,
  gameType: RoomGameType,
  startedBy: string,
  gameEngine: GameEngine,
): RoomGameSession => ({
  type: gameType,
  startedBy,
  startedAt: Date.now(),
  round: 1,
  status: "active",
  participants: [...roomData.users],
  leaderboard: roomData.users.reduce<Record<string, number>>((scores, user) => {
    scores[user] = 0;
    return scores;
  }, {}),
  moves: [],
  events: [createGameEvent(`${startedBy} started ${gameEngine.title}.`)],
  ...gameEngine.initializeSessionState(),
});
