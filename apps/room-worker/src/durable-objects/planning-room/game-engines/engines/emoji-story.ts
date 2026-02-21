import {
  ROUND_MOVE_TARGET,
  addEvent,
  addPoints,
  getCurrentRoundMoveCount,
  isValidEmojiStoryMove,
} from "../helpers";
import type { GameEngine } from "../types";

export const emojiStoryEngine: GameEngine = {
  title: "Emoji Story",
  initializeSessionState: () => ({}),
  isMoveValueValid: isValidEmojiStoryMove,
  applyMove: ({ session, userName, value }) => {
    addPoints(session, userName, 1);
    addEvent(session, `${userName} added “${value}” to the story.`);

    if (getCurrentRoundMoveCount(session) === ROUND_MOVE_TARGET) {
      session.round += 1;
    }
  },
};
