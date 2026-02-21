import {
  ROUND_MOVE_TARGET,
  addEvent,
  addPoints,
  getCurrentRoundMoveCount,
} from "../helpers";
import type { GameEngine } from "../types";

export const wordChainEngine: GameEngine = {
  title: "Word Chain",
  initializeSessionState: () => ({ lastWord: null }),
  applyMove: ({ session, userName, value }) => {
    const normalized = value.toLowerCase().replace(/[^a-z]/g, "");
    const prior = session.lastWord ?? null;
    const isValidWord = normalized.length >= 2;

    if (isValidWord) {
      if (!prior || normalized[0] === prior[prior.length - 1]) {
        session.lastWord = normalized;
        addPoints(session, userName, 2);
        addEvent(
          session,
          `${userName} kept the chain alive with “${value}”. +2 points.`,
        );
      } else {
        addEvent(session, `${userName} broke the chain with “${value}”.`);
      }
    } else {
      session.moves = session.moves.slice(0, -1);
      addEvent(
        session,
        `${userName} entered an invalid word. Use at least two letters.`,
      );
    }

    if (
      isValidWord &&
      getCurrentRoundMoveCount(session) === ROUND_MOVE_TARGET
    ) {
      session.round += 1;
    }
  },
};
