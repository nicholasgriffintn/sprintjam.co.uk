import {
  GUESS_ROUND_ATTEMPT_LIMIT,
  addEvent,
  addPoints,
  createNumberTarget,
  getCurrentRoundMoveCount,
} from "../helpers";
import type { GameEngine } from "../types";

export const guessTheNumberEngine: GameEngine = {
  title: "Guess the Number",
  initializeSessionState: () => ({ numberTarget: createNumberTarget() }),
  applyMove: ({ session, userName, value, move }) => {
    const guess = Number(value);
    if (
      !session.numberTarget ||
      session.numberTarget < 1 ||
      session.numberTarget > 20
    ) {
      session.numberTarget = createNumberTarget();
    }
    const target = session.numberTarget;

    if (
      Number.isFinite(guess) &&
      Number.isInteger(guess) &&
      guess >= 1 &&
      guess <= 20
    ) {
      let isExactGuess = false;
      const alreadyGuessedSameValueThisRound = session.moves.some(
        (gameMove) =>
          gameMove.id !== move.id &&
          gameMove.round === move.round &&
          gameMove.user === userName &&
          gameMove.value === value,
      );

      if (alreadyGuessedSameValueThisRound) {
        addEvent(
          session,
          `${userName} already guessed that number this wrong this round.`,
        );
      } else {
        if (guess === target) {
          isExactGuess = true;
          addPoints(session, userName, 3);
          addEvent(session, `${userName} nailed it with ${guess}. +3 points.`);
          session.round += 1;
          session.numberTarget = createNumberTarget();
        } else if (Math.abs(guess - target) <= 2) {
          addPoints(session, userName, 1);
          addEvent(
            session,
            `${userName} was close with their guess. +1 point.`,
          );
        } else {
          addEvent(session, `${userName} missed with their guess. No points.`);
        }
      }

      if (
        !isExactGuess &&
        getCurrentRoundMoveCount(session) >= GUESS_ROUND_ATTEMPT_LIMIT
      ) {
        session.round += 1;
        session.numberTarget = createNumberTarget();
        addEvent(
          session,
          `Round ${session.round - 1} closed without an exact hit. New number, round ${session.round}.`,
        );
      }
    } else {
      session.moves = session.moves.slice(0, -1);
      addEvent(
        session,
        `${userName} entered an invalid guess. Use a whole number from 1 to 20.`,
      );
    }
  },
};
