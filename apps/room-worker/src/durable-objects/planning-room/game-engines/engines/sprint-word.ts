import type { RoomGameSession } from "@sprintjam/types";

import type { GameEngine } from "../types";
import { addEvent, addPoints } from "../helpers";
import { SPRINT_WORD_BANK } from "../words";

const MAX_GUESSES = 6;

const pickFreshWord = (history: string[]): string => {
  const fresh = SPRINT_WORD_BANK.filter((w) => !history.includes(w));
  const pool = fresh.length > 0 ? fresh : SPRINT_WORD_BANK;
  return pool[Math.floor(Math.random() * pool.length)];
};

const scoreGuess = (
  guess: string,
  answer: string,
): ("correct" | "present" | "absent")[] => {
  const result: ("correct" | "present" | "absent")[] = Array(5).fill("absent");
  const answerRemaining = answer.split("");

  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) {
      result[i] = "correct";
      answerRemaining[i] = "";
    }
  }

  for (let i = 0; i < 5; i++) {
    if (result[i] === "correct") continue;
    const idx = answerRemaining.indexOf(guess[i]);
    if (idx !== -1) {
      result[i] = "present";
      answerRemaining[idx] = "";
    }
  }

  return result;
};

const assignNextWord = (session: Partial<RoomGameSession>) => {
  const history = session.sprintWordHistory ?? [];
  const word = pickFreshWord(history);
  session.sprintWordWord = word;
  session.sprintWordHistory = [
    ...history.filter((w) => w !== word),
    word,
  ].slice(-20);
};

export const sprintWordEngine: GameEngine = {
  title: "Sprint Word",
  maxRounds: 3,
  shouldBlockConsecutiveMoves: ({ session, userName }) => {
    return Boolean(session.sprintWordPlayerDone?.[userName]);
  },
  initializeSessionState: () => {
    const state: Partial<RoomGameSession> = {
      sprintWordPlayerGuesses: {},
      sprintWordPlayerDone: {},
      sprintWordHistory: [],
    };
    assignNextWord(state);
    return state;
  },
  isMoveValueValid: (value) => /^[A-Za-z]{5}$/.test(value),
  applyMove: ({ session, userName, value }) => {
    const done = session.sprintWordPlayerDone ?? {};

    if (done[userName]) {
      session.moves = session.moves.filter(
        (m) => !(m.user === userName && m.value === value),
      );
      return;
    }

    const guess = value.toUpperCase();
    const answer = session.sprintWordWord ?? "";
    const result = scoreGuess(guess, answer);

    const playerGuesses = session.sprintWordPlayerGuesses ?? {};
    const guesses = [
      ...(playerGuesses[userName] ?? []),
      { word: guess, result },
    ];
    session.sprintWordPlayerGuesses = { ...playerGuesses, [userName]: guesses };

    const isCorrect = result.every((r) => r === "correct");

    if (isCorrect) {
      const points = Math.max(1, 7 - guesses.length);
      addPoints(session, userName, points);
      session.sprintWordPlayerDone = { ...done, [userName]: true };
      addEvent(
        session,
        `${userName} solved it in ${guesses.length} ${guesses.length === 1 ? "guess" : "guesses"} (+${points} pts).`,
      );
    } else if (guesses.length >= MAX_GUESSES) {
      session.sprintWordPlayerDone = { ...done, [userName]: true };
      addEvent(
        session,
        `${userName} ran out of guesses. The word was ${answer}.`,
      );
    }

    const updatedDone = session.sprintWordPlayerDone ?? {};
    const allDone = session.participants.every((p) => updatedDone[p]);
    if (allDone) {
      session.round += 1;
      session.sprintWordPlayerGuesses = {};
      session.sprintWordPlayerDone = {};
      assignNextWord(session);
      addEvent(session, `Round ${session.round} started — new word!`);
    }
  },
};
