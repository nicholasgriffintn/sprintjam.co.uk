import type { RoomGameType } from "@sprintjam/types";

import { categoryBlitzEngine } from "./engines/category-blitz";
import { emojiStoryEngine } from "./engines/emoji-story";
import { guessTheNumberEngine } from "./engines/guess-the-number";
import { clueboardEngine } from "./engines/clueboard";
import { oneWordPitchEngine } from "./engines/one-word-pitch";
import { wordChainEngine } from "./engines/word-chain";
import type { GameEngine } from "./types";

export const GAME_ENGINES: Record<RoomGameType, GameEngine> = {
  "guess-the-number": guessTheNumberEngine,
  "word-chain": wordChainEngine,
  "emoji-story": emojiStoryEngine,
  "one-word-pitch": oneWordPitchEngine,
  "category-blitz": categoryBlitzEngine,
  clueboard: clueboardEngine,
};
