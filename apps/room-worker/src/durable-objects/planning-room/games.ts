import type { RoomData, RoomGameSession, RoomGameType } from "@sprintjam/types";
import { sanitizeGameSession } from "@sprintjam/utils";

import type { PlanningRoom } from ".";
import {
  MAX_GAME_ROUNDS,
  addEvent,
  createGameMove,
  initializeGameSession,
} from "./game-engines/helpers";
import { GAME_ENGINES } from "./game-engines/registry";

const getWinner = (session: RoomGameSession) => {
  const sortedScores = Object.entries(session.leaderboard).sort(
    (a, b) => b[1] - a[1],
  );
  const topScore = sortedScores[0]?.[1];

  if (topScore === undefined) {
    return undefined;
  }

  const topScorers = sortedScores
    .filter(([, score]) => score === topScore)
    .map(([name]) => name);
  return topScorers.length === 1 ? topScorers[0] : undefined;
};

const getClientGameSession = (session: RoomGameSession): RoomGameSession =>
  sanitizeGameSession(session) ?? session;

const sendClueboardSecretToCurrentClueGiver = (
  room: PlanningRoom,
  session: RoomGameSession,
) => {
  if (
    session.type !== "clueboard" ||
    session.status !== "active" ||
    session.codenamesRoundPhase !== "clue"
  ) {
    return;
  }

  const clueGiver = session.codenamesClueGiver;
  const blockerIndex = session.codenamesAssassinIndex;
  if (!clueGiver || blockerIndex === undefined) {
    return;
  }

  const payload = JSON.stringify({
    type: "clueboardSecret",
    round: session.round,
    blockerIndex,
  });

  room.sessions.forEach((sessionInfo, socket) => {
    if (sessionInfo.userName !== clueGiver) {
      return;
    }

    try {
      socket.send(payload);
    } catch (_error) {
      room.sessions.delete(socket);
    }
  });
};

const completeGameSession = async (
  room: PlanningRoom,
  roomData: RoomData,
  session: RoomGameSession,
  endedBy: string,
  reason: "manual" | "round-limit",
  roundLimit = MAX_GAME_ROUNDS,
) => {
  const winner = getWinner(session);
  session.status = "completed";
  session.winner = winner;

  if (reason === "round-limit") {
    addEvent(
      session,
      winner
        ? `Game ended after ${roundLimit} rounds. Winner: ${winner}.`
        : `Game ended after ${roundLimit} rounds in a tie.`,
    );
  } else {
    addEvent(
      session,
      winner
        ? `${endedBy} ended the game. Winner: ${winner}.`
        : `${endedBy} ended the game in a tie.`,
    );
  }

  roomData.gameSession = session;
  await room.putRoomData(roomData);

  room.broadcast({
    type: "gameEnded",
    gameSession: getClientGameSession(session),
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

  if (roomData.gameSession?.status === "active") {
    room.broadcast({
      type: "error",
      error: "A game is already running. End it before starting another one.",
      reason: "permission",
    });
    return;
  }

  const gameEngine = GAME_ENGINES[gameType];
  const cannotStartReason = gameEngine.canStart?.(roomData);
  if (cannotStartReason) {
    room.broadcast({
      type: "error",
      error: cannotStartReason,
      reason: "validation",
    });
    return;
  }

  const session = initializeGameSession(
    roomData,
    gameType,
    userName,
    gameEngine,
  );

  roomData.gameSession = session;
  await room.putRoomData(roomData);

  room.broadcast({
    type: "gameStarted",
    gameSession: getClientGameSession(session),
    startedBy: userName,
  });

  sendClueboardSecretToCurrentClueGiver(room, session);
}

export async function handleSubmitGameMove(
  room: PlanningRoom,
  userName: string,
  rawValue: string,
) {
  const roomData = await room.getRoomData();
  const session = roomData?.gameSession;

  if (!roomData || !session || session.status !== "active") {
    return;
  }

  const value = rawValue.trim();
  if (!value) {
    return;
  }

  const gameEngine = GAME_ENGINES[session.type];
  if (gameEngine.isMoveValueValid && !gameEngine.isMoveValueValid(value)) {
    return;
  }

  const latestMove = session.moves[session.moves.length - 1];
  const shouldBlockConsecutiveMoves =
    gameEngine.shouldBlockConsecutiveMoves?.({
      session,
      userName,
      value,
    }) ?? gameEngine.allowConsecutiveMoves !== true;
  if (
    shouldBlockConsecutiveMoves &&
    roomData.users.length > 1 &&
    latestMove?.user === userName
  ) {
    return;
  }

  const move = createGameMove(session, userName, value);
  session.moves = [...session.moves.slice(-29), move];

  gameEngine.applyMove({ session, userName, value, move });

  const roundLimit = gameEngine.maxRounds ?? MAX_GAME_ROUNDS;
  if (session.round > roundLimit) {
    await completeGameSession(
      room,
      roomData,
      session,
      "system",
      "round-limit",
      roundLimit,
    );
    return;
  }

  roomData.gameSession = session;
  await room.putRoomData(roomData);

  room.broadcast({
    type: "gameMoveSubmitted",
    gameSession: getClientGameSession(session),
    user: userName,
  });

  sendClueboardSecretToCurrentClueGiver(room, session);
}

export async function handleEndGame(room: PlanningRoom, userName: string) {
  const roomData = await room.getRoomData();
  const session = roomData?.gameSession;

  if (!roomData || !session || session.status !== "active") {
    return;
  }

  await completeGameSession(room, roomData, session, userName, "manual");
}
