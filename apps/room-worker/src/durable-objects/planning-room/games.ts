import type { RoomData, RoomGameSession, RoomGameType } from '@sprintjam/types';

import type { PlanningRoom } from '.';

const GAME_TITLES: Record<RoomGameType, string> = {
  'guess-the-number': 'Guess the Number',
  'word-chain': 'Word Chain',
  'emoji-story': 'Emoji Story',
};
const MAX_GAME_ROUNDS = 5;
const ROUND_MOVE_TARGET = 6;
const GUESS_ROUND_ATTEMPT_LIMIT = 10;
const MAX_EMOJI_STORY_MOVE_EMOJIS = 6;
const EMOJI_TOKEN_PATTERN =
  /(?:\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*|\p{Regional_Indicator}{2}|[0-9#*]\uFE0F?\u20E3)/gu;

const createGameEvent = (message: string) => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  message,
  createdAt: Date.now(),
});

const initializeSession = (
  roomData: RoomData,
  gameType: RoomGameType,
  startedBy: string,
): RoomGameSession => ({
  type: gameType,
  startedBy,
  startedAt: Date.now(),
  round: 1,
  status: 'active',
  participants: [...roomData.users],
  leaderboard: roomData.users.reduce<Record<string, number>>((scores, user) => {
    scores[user] = 0;
    return scores;
  }, {}),
  moves: [],
  events: [createGameEvent(`${startedBy} started ${GAME_TITLES[gameType]}.`)],
});

const addPoints = (session: RoomGameSession, userName: string, points: number) => {
  session.leaderboard[userName] = (session.leaderboard[userName] ?? 0) + points;
};

const addEvent = (session: RoomGameSession, message: string) => {
  session.events = [...session.events.slice(-9), createGameEvent(message)];
};

const getCurrentRoundMoveCount = (session: RoomGameSession) =>
  session.moves.filter((gameMove) => gameMove.round === session.round).length;

const isValidEmojiStoryMove = (value: string) => {
  const compactValue = value.replace(/\s+/g, '');
  if (!compactValue) {
    return false;
  }

  const emojiTokens = compactValue.match(EMOJI_TOKEN_PATTERN) ?? [];
  if (emojiTokens.length === 0 || emojiTokens.length > MAX_EMOJI_STORY_MOVE_EMOJIS) {
    return false;
  }

  return emojiTokens.join('') === compactValue;
};

const getWinner = (session: RoomGameSession) => {
  const sortedScores = Object.entries(session.leaderboard).sort((a, b) => b[1] - a[1]);
  const topScore = sortedScores[0]?.[1];

  if (topScore === undefined) {
    return undefined;
  }

  const topScorers = sortedScores.filter(([, score]) => score === topScore).map(([name]) => name);
  return topScorers.length === 1 ? topScorers[0] : undefined;
};

const completeGameSession = async (
  room: PlanningRoom,
  roomData: RoomData,
  session: RoomGameSession,
  endedBy: string,
  reason: 'manual' | 'round-limit',
) => {
  const winner = getWinner(session);
  session.status = 'completed';
  session.winner = winner;

  if (reason === 'round-limit') {
    addEvent(
      session,
      winner
        ? `Game ended after ${MAX_GAME_ROUNDS} rounds. Winner: ${winner}.`
        : `Game ended after ${MAX_GAME_ROUNDS} rounds in a tie.`,
    );
  } else {
    addEvent(
      session,
      winner
        ? `${endedBy} ended the game. Winner: ${winner}.`
        : `${endedBy} ended the game in a tie.`,
    );
  }

  room.clearGameRuntime();
  roomData.gameSession = session;
  await room.putRoomData(roomData);

  room.broadcast({
    type: 'gameEnded',
    gameSession: session,
    endedBy,
  });
};

export async function handleStartGame(
  room: PlanningRoom,
  userName: string,
  gameType: RoomGameType,
) {
  const roomData = await room.getRoomData();
  if (!roomData) {
    return;
  }

  if (roomData.gameSession?.status === 'active') {
    room.broadcast({
      type: 'error',
      error: 'A game is already running. End it before starting another one.',
      reason: 'permission',
    });
    return;
  }

  room.resetGameRuntime(gameType);
  const session = initializeSession(roomData, gameType, userName);
  roomData.gameSession = session;
  await room.putRoomData(roomData);

  room.broadcast({
    type: 'gameStarted',
    gameSession: session,
    startedBy: userName,
  });
}

export async function handleSubmitGameMove(
  room: PlanningRoom,
  userName: string,
  rawValue: string,
) {
  const roomData = await room.getRoomData();
  const session = roomData?.gameSession;

  if (!roomData || !session || session.status !== 'active') {
    return;
  }

  const value = rawValue.trim();
  if (!value) {
    return;
  }

  if (session.type === 'emoji-story' && !isValidEmojiStoryMove(value)) {
    return;
  }

  const latestMove = session.moves[session.moves.length - 1];
  if (roomData.users.length > 1 && latestMove?.user === userName) {
    return;
  }

  const move = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    user: userName,
    submittedAt: Date.now(),
    value,
    round: session.round,
  };

  session.moves = [...session.moves.slice(-29), move];

  if (session.type === 'guess-the-number') {
    const guess = Number(value);
    const target = room.getNumberTarget();

    if (Number.isFinite(guess) && Number.isInteger(guess) && guess >= 1 && guess <= 20) {
      let isExactGuess = false;

      if (guess === target) {
        isExactGuess = true;
        addPoints(session, userName, 3);
        addEvent(session, `${userName} nailed it with ${guess}. +3 points.`);
        session.round += 1;
        room.setNumberTarget();
      } else if (Math.abs(guess - target) <= 2) {
        addPoints(session, userName, 1);
        addEvent(session, `${userName} was close with ${guess}. +1 point.`);
      }

      if (!isExactGuess && getCurrentRoundMoveCount(session) >= GUESS_ROUND_ATTEMPT_LIMIT) {
        session.round += 1;
        room.setNumberTarget();
        addEvent(
          session,
          `Round ${session.round - 1} closed without an exact hit. New number, round ${session.round}.`,
        );
      }
    }
  }

  if (session.type === 'word-chain') {
    const normalized = value.toLowerCase().replace(/[^a-z]/g, '');
    const prior = room.getLastWord();

    if (normalized.length >= 2) {
      if (!prior || normalized[0] === prior[prior.length - 1]) {
        room.setLastWord(normalized);
        addPoints(session, userName, 2);
        addEvent(session, `${userName} kept the chain alive with “${value}”. +2 points.`);
      } else {
        addEvent(session, `${userName} broke the chain with “${value}”.`);
      }
    }

    if (getCurrentRoundMoveCount(session) === ROUND_MOVE_TARGET) {
      session.round += 1;
    }
  }

  if (session.type === 'emoji-story') {
    addPoints(session, userName, 1);
    addEvent(session, `${userName} added “${value}” to the story.`);

    if (getCurrentRoundMoveCount(session) === ROUND_MOVE_TARGET) {
      session.round += 1;
    }
  }

  if (session.round > MAX_GAME_ROUNDS) {
    await completeGameSession(room, roomData, session, 'system', 'round-limit');
    return;
  }

  roomData.gameSession = session;
  await room.putRoomData(roomData);

  room.broadcast({
    type: 'gameMoveSubmitted',
    gameSession: session,
    user: userName,
  });
}

export async function handleEndGame(room: PlanningRoom, userName: string) {
  const roomData = await room.getRoomData();
  const session = roomData?.gameSession;

  if (!roomData || !session || session.status !== 'active') {
    return;
  }

  await completeGameSession(room, roomData, session, userName, 'manual');
}
