import type { RoomGameSession } from "@sprintjam/types";

import {
  MICRO_CODENAMES_ROUND_LIMIT,
  addEvent,
  addPoints,
  initializeMicroCodenamesRound,
} from "../helpers";
import type { GameEngine } from "../types";

const MICRO_CODENAMES_CLUE_PATTERN = /^[a-z][a-z-]{1,18}$/i;

const playerAlreadyMovedInRound = (
  session: RoomGameSession,
  userName: string,
  moveId: string,
) =>
  session.moves.some(
    (gameMove) =>
      gameMove.id !== moveId &&
      gameMove.round === session.round &&
      gameMove.user === userName,
  );

const parseTargetIndices = (
  rawIndices: string | undefined,
  boardSize: number,
) => {
  if (!rawIndices) {
    return [];
  }

  const parsed = rawIndices
    .split(",")
    .map((token) => Number(token.trim()))
    .filter(
      (index) => Number.isInteger(index) && index >= 0 && index < boardSize,
    );

  return Array.from(new Set(parsed));
};

const parseMicroCodenamesClue = (value: string, boardSize: number) => {
  const trimmed = value.trim().toLowerCase();
  let clueText = "";
  let targetText = "";
  let targetIndicesText = "";

  if (trimmed.startsWith("clue:")) {
    const withoutPrefix = trimmed.slice("clue:".length);
    const [rawClue, rawTarget, rawIndices] = withoutPrefix.split("|");
    clueText = rawClue?.trim() ?? "";
    targetText = rawTarget?.trim() ?? "";
    targetIndicesText = rawIndices?.trim() ?? "";
  } else {
    const match = /^([a-z-]+)\s+([1-4])$/i.exec(trimmed);
    if (!match) {
      return undefined;
    }
    clueText = match[1].trim();
    targetText = match[2];
  }

  const target = Number(targetText);
  if (
    !MICRO_CODENAMES_CLUE_PATTERN.test(clueText) ||
    !Number.isInteger(target) ||
    target < 1 ||
    target > 4
  ) {
    return undefined;
  }

  const targetIndices = parseTargetIndices(targetIndicesText, boardSize);
  return { clue: clueText, target, targetIndices };
};

const parseMicroCodenamesGuess = (value: string, board: string[]) => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed === "pass") {
    return "pass";
  }

  if (trimmed.startsWith("guess:")) {
    const index = Number(trimmed.slice("guess:".length));
    if (Number.isInteger(index) && index >= 0 && index < board.length) {
      return index;
    }
    return undefined;
  }

  const directMatchIndex = board.findIndex(
    (word) => word.toLowerCase() === trimmed,
  );
  return directMatchIndex >= 0 ? directMatchIndex : undefined;
};

const advanceRound = (session: RoomGameSession) => {
  session.round += 1;
  if (session.round <= MICRO_CODENAMES_ROUND_LIMIT) {
    initializeMicroCodenamesRound(session);
  }
};

export const microCodenamesEngine: GameEngine = {
  title: "Clueboard",
  maxRounds: MICRO_CODENAMES_ROUND_LIMIT,
  allowConsecutiveMoves: true,
  canStart: (roomData) =>
    roomData.users.length < 2
      ? "Clueboard needs at least 2 players."
      : undefined,
  initializeSessionState: (roomData) => {
    const sessionState: Pick<RoomGameSession, "participants" | "round"> &
      Partial<RoomGameSession> = {
      participants: [...roomData.users],
      round: 1,
    };
    initializeMicroCodenamesRound(sessionState);
    return sessionState;
  },
  applyMove: ({ session, userName, value, move }) => {
    if (
      !session.codenamesBoard ||
      !session.codenamesTargetIndices ||
      session.codenamesAssassinIndex === undefined
    ) {
      initializeMicroCodenamesRound(session);
    }

    const board = session.codenamesBoard ?? [];
    const clueGiver = session.codenamesClueGiver;
    const phase = session.codenamesRoundPhase ?? "clue";

    if (phase === "clue") {
      if (!clueGiver || userName !== clueGiver) {
        session.moves = session.moves.slice(0, -1);
        addEvent(
          session,
          `${userName} cannot set the clue this round. Waiting for ${clueGiver ?? "the clue giver"}.`,
        );
        return;
      }

      if (playerAlreadyMovedInRound(session, userName, move.id)) {
        session.moves = session.moves.slice(0, -1);
        addEvent(
          session,
          `${userName} already submitted the clue for round ${session.round}.`,
        );
        return;
      }

      const parsedClue = parseMicroCodenamesClue(value, board.length);
      if (!parsedClue) {
        session.moves = session.moves.slice(0, -1);
        addEvent(
          session,
          `${userName} entered an invalid clue. Use "clue:word|number|i,j" (for example, clue:ship|2|1,7).`,
        );
        return;
      }

      const revealed = session.codenamesRevealedIndices ?? [];
      const blockerIndex = session.codenamesAssassinIndex;
      const selectedTargetsAreValid =
        parsedClue.targetIndices.length === parsedClue.target &&
        parsedClue.targetIndices.every((index) => !revealed.includes(index)) &&
        (blockerIndex === undefined ||
          !parsedClue.targetIndices.includes(blockerIndex));
      if (!selectedTargetsAreValid) {
        session.moves = session.moves.slice(0, -1);
        addEvent(
          session,
          `${userName} must select exactly ${parsedClue.target} unrevealed target words and cannot include the blocker word.`,
        );
        return;
      }

      session.codenamesCurrentClue = parsedClue.clue;
      session.codenamesCurrentClueTarget = parsedClue.target;
      session.codenamesTargetIndices = parsedClue.targetIndices;
      session.codenamesCurrentGuesses = 0;
      session.codenamesRoundPhase = "guess";
      addEvent(
        session,
        `${userName} set clue "${parsedClue.clue}" for ${parsedClue.target}. Guessers, go.`,
      );
      return;
    }

    if (!clueGiver || userName === clueGiver) {
      session.moves = session.moves.slice(0, -1);
      addEvent(
        session,
        `${userName} cannot guess this round while acting as clue giver.`,
      );
      return;
    }

    const guess = parseMicroCodenamesGuess(value, board);
    if (guess === undefined) {
      session.moves = session.moves.slice(0, -1);
      addEvent(
        session,
        `${userName} entered an invalid guess. Click a board word or send "guess:index".`,
      );
      return;
    }

    if (guess === "pass") {
      addEvent(session, `${userName} passed. Moving to next round.`);
      advanceRound(session);
      return;
    }

    const revealed = session.codenamesRevealedIndices ?? [];
    if (revealed.includes(guess)) {
      session.moves = session.moves.slice(0, -1);
      addEvent(session, `${userName} guessed a word that is already revealed.`);
      return;
    }

    session.codenamesRevealedIndices = [...revealed, guess];

    if (guess === session.codenamesAssassinIndex) {
      addPoints(session, userName, -1);
      addEvent(
        session,
        `${userName} hit the blocker word "${board[guess]}". Game over.`,
      );
      session.round = MICRO_CODENAMES_ROUND_LIMIT + 1;
      return;
    }

    const targetIndices = session.codenamesTargetIndices ?? [];
    if (targetIndices.includes(guess)) {
      addPoints(session, userName, 2);
      addPoints(session, clueGiver, 1);
      session.codenamesCurrentGuesses =
        (session.codenamesCurrentGuesses ?? 0) + 1;
      addEvent(
        session,
        `${userName} found target "${board[guess]}". +2 guesser, +1 clue giver.`,
      );

      const remainingTargets = targetIndices.filter(
        (index) => !(session.codenamesRevealedIndices ?? []).includes(index),
      );
      if (remainingTargets.length === 0) {
        addPoints(session, clueGiver, 2);
        addEvent(session, `All targets found. ${clueGiver} gets +2 bonus.`);
        advanceRound(session);
        return;
      }

      if (
        (session.codenamesCurrentGuesses ?? 0) >=
        (session.codenamesCurrentClueTarget ?? 1)
      ) {
        addEvent(session, "Guess limit reached. Moving to next round.");
        advanceRound(session);
      }
      return;
    }

    addEvent(
      session,
      `${userName} revealed neutral word "${board[guess]}". Round ends.`,
    );
    advanceRound(session);
  },
};
