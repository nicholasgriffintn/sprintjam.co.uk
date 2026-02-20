import type { RoomData, RoomGameSession, RoomGameType } from '@sprintjam/types';

import type { PlanningRoom } from '.';

const GAME_TITLES: Record<RoomGameType, string> = {
  'guess-the-number': 'Guess the Number',
  'word-chain': 'Word Chain',
  'emoji-story': 'Emoji Story',
};

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
      if (guess === target) {
        addPoints(session, userName, 3);
        session.events = [
          ...session.events.slice(-9),
          createGameEvent(`${userName} nailed it with ${guess}. +3 points.`),
        ];
        session.round += 1;
        room.setNumberTarget();
      } else if (Math.abs(guess - target) <= 2) {
        addPoints(session, userName, 1);
        session.events = [
          ...session.events.slice(-9),
          createGameEvent(`${userName} was close with ${guess}. +1 point.`),
        ];
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
        session.events = [
          ...session.events.slice(-9),
          createGameEvent(`${userName} kept the chain alive with “${value}”. +2 points.`),
        ];
      } else {
        session.events = [
          ...session.events.slice(-9),
          createGameEvent(`${userName} broke the chain with “${value}”.`),
        ];
      }
    }
  }

  if (session.type === 'emoji-story') {
    addPoints(session, userName, 1);
    session.events = [
      ...session.events.slice(-9),
      createGameEvent(`${userName} added “${value}” to the story.`),
    ];

    const currentRoundMoves = session.moves.filter(
      (gameMove) => gameMove.round === session.round,
    ).length;
    if (currentRoundMoves === 6) {
      session.round += 1;
    }
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

  const winner = Object.entries(session.leaderboard)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)[0];

  session.status = 'completed';
  session.winner = winner;
  session.events = [
    ...session.events.slice(-9),
    createGameEvent(
      winner
        ? `${userName} ended the game. Winner: ${winner}.`
        : `${userName} ended the game.`,
    ),
  ];

  room.clearGameRuntime();
  roomData.gameSession = session;
  await room.putRoomData(roomData);

  room.broadcast({
    type: 'gameEnded',
    gameSession: session,
    endedBy: userName,
  });
}
