import type { RoomGameSession } from "@sprintjam/types";

import {
  addEvent,
  addPoints,
  assignNextOneWordPitchPrompt,
  getCurrentRoundMoveCount,
  getCurrentRoundMoves,
  getRoundSubmissionCounts,
} from "../helpers";
import type { GameEngine } from "../types";

const ONE_WORD_PATTERN = /^[a-z][a-z0-9-]{0,23}$/i;

const normalizeSingleWord = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");

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

const scoreUniquenessRound = (
  session: RoomGameSession,
  uniquePoints: number,
  duplicatePoints: number,
) => {
  const roundMoves = getCurrentRoundMoves(session);
  const counts = getRoundSubmissionCounts(session, normalizeSingleWord);

  roundMoves.forEach((roundMove) => {
    const normalized = normalizeSingleWord(roundMove.value);
    if (!normalized) {
      return;
    }

    const isUnique = (counts.get(normalized) ?? 0) === 1;
    addPoints(
      session,
      roundMove.user,
      isUnique ? uniquePoints : duplicatePoints,
    );
  });
};

export const oneWordPitchEngine: GameEngine = {
  title: "One-Word Pitch",
  maxRounds: 3,
  initializeSessionState: () => {
    const sessionState: Partial<RoomGameSession> = {
      oneWordPitchPromptHistory: [],
    };
    assignNextOneWordPitchPrompt(sessionState);
    return sessionState;
  },
  applyMove: ({ session, userName, value, move }) => {
    const normalized = normalizeSingleWord(value);
    const isValidSubmission = ONE_WORD_PATTERN.test(value.trim());

    if (!normalized || !isValidSubmission) {
      session.moves = session.moves.slice(0, -1);
      addEvent(
        session,
        `${userName} entered an invalid pitch word. Use one word with letters, numbers, or hyphens.`,
      );
      return;
    }

    if (playerAlreadyMovedInRound(session, userName, move.id)) {
      session.moves = session.moves.slice(0, -1);
      addEvent(
        session,
        `${userName} already submitted in round ${session.round}.`,
      );
      return;
    }

    addEvent(session, `${userName} pitched "${normalized}".`);

    if (getCurrentRoundMoveCount(session) >= session.participants.length) {
      scoreUniquenessRound(session, 3, 1);
      addEvent(
        session,
        `Round ${session.round} scored. Unique words earned +3, duplicates +1.`,
      );
      session.round += 1;
      assignNextOneWordPitchPrompt(session);
    }
  },
};
