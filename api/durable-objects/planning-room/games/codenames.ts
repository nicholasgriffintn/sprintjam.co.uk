import type { CodenamesState, CodenamesTeam } from '../../../types';
import {
  buildNewCodenamesState,
  calculateRemaining,
  getOppositeTeam,
} from '../../../services/games/codenames';
import { redactCodenamesState } from '../../../utils/room-data';
import type { PlanningRoom } from '..';

function sendStateToSpymasters(room: PlanningRoom, state?: CodenamesState) {
  if (!state?.assignments) {
    return;
  }

  const payload = JSON.stringify({
    type: 'codenamesState',
    codenamesState: { ...state },
    spymasterView: true,
  });

  for (const [socket, session] of room.sessions.entries()) {
    const team = state.spymasters[session.userName];
    if (!team) continue;
    try {
      session.webSocket.send(payload);
    } catch (_err) {
      room.sessions.delete(socket);
    }
  }
}

function broadcastCodenames(room: PlanningRoom, state?: CodenamesState) {
  const redacted = state ? redactCodenamesState(state) : undefined;
  room.broadcast({
    type: 'codenamesState',
    codenamesState: redacted,
  });
  sendStateToSpymasters(room, state);
}

function recalcRemaining(state: CodenamesState) {
  if (!state.assignments) {
    return state.remaining;
  }
  state.remaining = calculateRemaining(state.assignments, state.revealed);
  return state.remaining;
}

function ensureTeamsContainUser(
  state: CodenamesState,
  userName: string,
  team: CodenamesTeam
) {
  const otherTeam = team === 'red' ? 'blue' : 'red';
  state.teams[team] = Array.from(new Set([...state.teams[team], userName]));
  state.teams[otherTeam] = state.teams[otherTeam].filter((u) => u !== userName);
}

function resetClue(state: CodenamesState) {
  state.clueWord = null;
  state.clueCount = null;
  state.guessesRemaining = null;
  state.guessesTaken = 0;
}

function setClue(state: CodenamesState, word: string, count: number) {
  state.clueWord = word;
  state.clueCount = count;
  state.guessesRemaining = count + 1;
  state.guessesTaken = 0;
}

export async function handleStartCodenames(
  room: PlanningRoom,
  userName: string
) {
  await room.state.blockConcurrencyWhile(async () => {
    const roomData = await room.getRoomData({ skipConcurrencyBlock: true });
    if (!roomData) return;
    if (roomData.moderator !== userName) {
      return;
    }

    const nextState = buildNewCodenamesState(roomData.users, userName);
    roomData.gameStates = {
      ...(roomData.gameStates ?? {}),
      codenames: nextState,
    };
    roomData.codenamesState = nextState;

    await room.putRoomData(roomData);
    broadcastCodenames(room, nextState);
  });
}

export async function handleRevealCodenames(
  room: PlanningRoom,
  userName: string,
  index: number
) {
  await room.state.blockConcurrencyWhile(async () => {
    const roomData = await room.getRoomData({ skipConcurrencyBlock: true });
    const state =
      (roomData?.gameStates?.codenames as CodenamesState | undefined) ??
      roomData?.codenamesState;
    if (!roomData || !state || !state.assignments) {
      return;
    }

    const myTeam =
      state.teams.red.includes(userName) || state.spymasters[userName] === 'red'
        ? 'red'
        : state.teams.blue.includes(userName) ||
          state.spymasters[userName] === 'blue'
        ? 'blue'
        : null;
    const isSpymaster = !!state.spymasters[userName];
    if (!myTeam || myTeam !== state.activeTeam) {
      return;
    }
    if (isSpymaster) {
      return;
    }
    if (state.winner) {
      return;
    }
    if (state.clueWord === null || state.clueCount === null) {
      return;
    }
    if (!state.guessesRemaining || state.guessesRemaining <= 0) {
      return;
    }
    if (state.winner || index < 0 || index >= state.board.length) {
      return;
    }
    if (state.revealed[index]) {
      return;
    }

    state.revealed[index] = true;
    const cardType = state.assignments[index];

    recalcRemaining(state);

    if (cardType === 'assassin') {
      state.winner = getOppositeTeam(state.activeTeam);
      state.guessesRemaining = 0;
    } else if (cardType === 'red' || cardType === 'blue') {
      if (state.remaining[cardType] === 0) {
        state.winner = cardType;
      } else if (cardType !== state.activeTeam) {
        state.activeTeam = getOppositeTeam(state.activeTeam);
        resetClue(state);
      }
    } else {
      state.activeTeam = getOppositeTeam(state.activeTeam);
      resetClue(state);
    }

    state.guessesRemaining =
      state.guessesRemaining !== null && state.guessesRemaining > 0
        ? state.guessesRemaining - 1
        : state.guessesRemaining;
    state.guessesTaken = (state.guessesTaken ?? 0) + 1;

    if (!state.winner) {
      if (cardType === state.activeTeam) {
        if (state.guessesRemaining !== null && state.guessesRemaining <= 0) {
          state.activeTeam = getOppositeTeam(state.activeTeam);
          resetClue(state);
        }
      }
    }

    state.version += 1;

    roomData.gameStates = {
      ...(roomData.gameStates ?? {}),
      codenames: state,
    };
    roomData.codenamesState = state;

    await room.putRoomData(roomData);
    broadcastCodenames(room, state);
  });
}

export async function handleEndCodenames(room: PlanningRoom, userName: string) {
  await room.state.blockConcurrencyWhile(async () => {
    const roomData = await room.getRoomData({ skipConcurrencyBlock: true });
    if (!roomData?.codenamesState) {
      return;
    }
    if (roomData.moderator !== userName) {
      return;
    }

    if (roomData.gameStates) {
      const { codenames, ...rest } = roomData.gameStates as Record<
        string,
        unknown
      >;
      roomData.gameStates = Object.keys(rest).length > 0 ? rest : undefined;
    }
    roomData.codenamesState = undefined;
    await room.putRoomData(roomData);
    broadcastCodenames(room, undefined);
  });
}

export async function handleCodenamesClue(
  room: PlanningRoom,
  userName: string,
  word: string,
  count: number
) {
  await room.state.blockConcurrencyWhile(async () => {
    const roomData = await room.getRoomData({ skipConcurrencyBlock: true });
    const state =
      (roomData?.gameStates?.codenames as CodenamesState | undefined) ??
      roomData?.codenamesState;
    if (!roomData || !state || !state.assignments) {
      return;
    }
    if (
      roomData.moderator !== userName &&
      state.spymasters[userName] !== state.activeTeam
    ) {
      return;
    }
    if (state.spymasters[userName] !== state.activeTeam) {
      return;
    }
    if (state.winner) {
      return;
    }
    if (state.guessesTaken && state.guessesTaken > 0) {
      return;
    }

    setClue(state, word, count);
    state.version += 1;

    roomData.gameStates = {
      ...(roomData.gameStates ?? {}),
      codenames: state,
    };
    roomData.codenamesState = state;

    await room.putRoomData(roomData);
    broadcastCodenames(room, state);
  });
}

export async function handleCodenamesPass(
  room: PlanningRoom,
  userName: string
) {
  await room.state.blockConcurrencyWhile(async () => {
    const roomData = await room.getRoomData({ skipConcurrencyBlock: true });
    const state =
      (roomData?.gameStates?.codenames as CodenamesState | undefined) ??
      roomData?.codenamesState;
    if (!roomData || !state || !state.assignments) {
      return;
    }

    const myTeam =
      state.teams.red.includes(userName) || state.spymasters[userName] === 'red'
        ? 'red'
        : state.teams.blue.includes(userName) ||
          state.spymasters[userName] === 'blue'
        ? 'blue'
        : null;
    if (!myTeam || myTeam !== state.activeTeam) {
      return;
    }
    if (state.winner) {
      return;
    }
    state.activeTeam = getOppositeTeam(state.activeTeam);
    resetClue(state);
    state.version += 1;

    roomData.gameStates = {
      ...(roomData.gameStates ?? {}),
      codenames: state,
    };
    roomData.codenamesState = state;

    await room.putRoomData(roomData);
    broadcastCodenames(room, state);
  });
}
