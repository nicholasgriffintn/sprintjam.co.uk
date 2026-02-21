import type { RoomData, RoomGameSession, RoomGameType } from "@sprintjam/types";

import type { GameEngine } from "./types";
import {
  ONE_WORD_PITCH_PROMPTS,
  CLUEBOARD_WORD_BANK,
  CATEGORY_BLITZ_CATEGORIES,
  CATEGORY_BLITZ_LETTERS,
} from "./words";

export const MAX_GAME_ROUNDS = 5;
export const ROUND_MOVE_TARGET = 6;
export const GUESS_ROUND_ATTEMPT_LIMIT = 10;
export const CLUEBOARD_ROUND_LIMIT = 3;
const CLUEBOARD_BOARD_SIZE = 12;
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

export const getCurrentRoundMoves = (session: RoomGameSession) =>
  session.moves.filter((gameMove) => gameMove.round === session.round);

export const getCurrentRoundMoveCount = (session: RoomGameSession) =>
  getCurrentRoundMoves(session).length;

export const hasPlayerMovedThisRound = (
  session: RoomGameSession,
  userName: string,
) =>
  getCurrentRoundMoves(session).some((gameMove) => gameMove.user === userName);

export const getRoundSubmissionCounts = (
  session: RoomGameSession,
  normalize: (value: string) => string,
) => {
  const roundMoves = getCurrentRoundMoves(session);
  const counts = new Map<string, number>();

  roundMoves.forEach((move) => {
    const key = normalize(move.value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return counts;
};

const pickRandom = <T>(values: T[]) =>
  values[Math.floor(Math.random() * values.length)];

const pickFreshValue = (pool: string[], history: string[]) => {
  const freshPool = pool.filter((value) => !history.includes(value));
  const source = freshPool.length > 0 ? freshPool : pool;
  return pickRandom(source);
};

const addToHistory = (history: string[], value: string, maxEntries = 10) =>
  [...history.filter((entry) => entry !== value), value].slice(-maxEntries);

export const assignNextOneWordPitchPrompt = (
  session: Partial<RoomGameSession>,
) => {
  const history = session.oneWordPitchPromptHistory ?? [];
  const prompt = pickFreshValue(ONE_WORD_PITCH_PROMPTS, history);

  session.oneWordPitchPrompt = prompt;
  session.oneWordPitchPromptHistory = addToHistory(history, prompt);
};

const buildCategoryBlitzKey = (category: string, letter: string) =>
  `${category}|${letter}`;

export const assignNextCategoryBlitzPrompt = (
  session: Partial<RoomGameSession>,
) => {
  const history = session.categoryBlitzHistory ?? [];
  const combinations = CATEGORY_BLITZ_CATEGORIES.flatMap((category) =>
    CATEGORY_BLITZ_LETTERS.map((letter) =>
      buildCategoryBlitzKey(category, letter),
    ),
  );
  const selected = pickFreshValue(combinations, history);
  const [category, letter] = selected.split("|");

  session.categoryBlitzCategory = category;
  session.categoryBlitzLetter = letter;
  session.categoryBlitzHistory = addToHistory(history, selected);
};

const randomIndices = (size: number, count: number) => {
  const available = Array.from({ length: size }, (_, index) => index);
  const selected: number[] = [];

  while (selected.length < count && available.length > 0) {
    const selectedIndex = Math.floor(Math.random() * available.length);
    const [value] = available.splice(selectedIndex, 1);
    selected.push(value);
  }

  return selected;
};

const sampleUniqueWords = (pool: string[], count: number) => {
  const selectedIndices = randomIndices(pool.length, count);
  return selectedIndices.map((index) => pool[index]);
};

export const initializeClueboardRound = (
  session: Pick<RoomGameSession, "participants" | "round"> &
    Partial<RoomGameSession>,
) => {
  const board = sampleUniqueWords(CLUEBOARD_WORD_BANK, CLUEBOARD_BOARD_SIZE);
  const assassinIndex = pickRandom(
    Array.from({ length: board.length }, (_, index) => index),
  );

  session.codenamesBoard = board;
  session.codenamesTargetIndices = [];
  session.codenamesAssassinIndex = assassinIndex;
  session.codenamesRevealedIndices = [];
  session.codenamesRoundPhase = "clue";
  session.codenamesCurrentClue = null;
  session.codenamesCurrentClueTarget = undefined;
  session.codenamesCurrentGuesses = 0;
  session.codenamesClueGiver =
    session.participants[(session.round - 1) % session.participants.length] ??
    null;
};

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
  ...gameEngine.initializeSessionState(roomData),
});
