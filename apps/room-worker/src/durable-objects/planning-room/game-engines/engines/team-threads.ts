import type { RoomData, RoomGameSession } from '@sprintjam/types';

import type { GameEngine } from '../types';
import { addEvent, addPoints } from '../helpers';
import { TEAM_THREADS_PUZZLES } from '../words';

const TEAM_THREADS_LIVES = 4;
const BONUS_POINTS_ON_COMPLETE = 2;
const CORRECT_GROUP_POINTS = 3;

const pickPuzzleIndex = (used: number[]): number => {
  const available = TEAM_THREADS_PUZZLES.map((_, i) => i).filter(
    (i) => !used.includes(i),
  );
  const pool =
    available.length > 0 ? available : TEAM_THREADS_PUZZLES.map((_, i) => i);
  return pool[Math.floor(Math.random() * pool.length)];
};

const loadPuzzle = (session: Partial<RoomGameSession>, puzzleIndex: number) => {
  const puzzle = TEAM_THREADS_PUZZLES[puzzleIndex];
  const allWords = puzzle.groups.flatMap((g) => g.words);
  for (let i = allWords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
  }
  session.teamThreadsWords = allWords;
  session.teamThreadsGroups = puzzle.groups;
  session.teamThreadsFoundGroups = [];
  session.teamThreadsLives = TEAM_THREADS_LIVES;
};

const initializePuzzle = (
  session: Partial<RoomGameSession>,
  _roomData: RoomData,
) => {
  const used = session.teamThreadsUsedPuzzles ?? [];
  const index = pickPuzzleIndex(used);
  loadPuzzle(session, index);
  session.teamThreadsUsedPuzzles = [
    ...used.filter((i) => i !== index),
    index,
  ].slice(-TEAM_THREADS_PUZZLES.length);
  return index;
};

export const teamThreadsEngine: GameEngine = {
  title: 'Team Threads',
  maxRounds: 3,
  shouldBlockConsecutiveMoves: () => false,
  initializeSessionState: (roomData) => {
    const state: Partial<RoomGameSession> = {
      teamThreadsUsedPuzzles: [],
    };
    initializePuzzle(state, roomData);
    return state;
  },
  isMoveValueValid: (value) => {
    const parts = value
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean);
    return parts.length === 4;
  },
  applyMove: ({ session, userName, value }) => {
    const submitted = value
      .split(',')
      .map((w) => w.trim().toUpperCase())
      .filter(Boolean);

    if (submitted.length !== 4) return;

    const groups = session.teamThreadsGroups ?? [];
    const foundGroups = session.teamThreadsFoundGroups ?? [];
    const foundCategories = new Set(foundGroups.map((g) => g.category));

    const match = groups.find((group) => {
      if (foundCategories.has(group.category)) return false;
      const normalised = group.words.map((w) => w.toUpperCase());
      return (
        submitted.length === normalised.length &&
        submitted.every((w) => normalised.includes(w)) &&
        normalised.every((w) => submitted.includes(w))
      );
    });

    if (match) {
      const newFound = [
        ...foundGroups,
        {
          category: match.category,
          words: match.words,
          difficulty: match.difficulty,
          foundBy: userName,
        },
      ];
      session.teamThreadsFoundGroups = newFound;

      addPoints(session, userName, CORRECT_GROUP_POINTS);
      addEvent(
        session,
        `${userName} found "${match.category}" (+${CORRECT_GROUP_POINTS} pts).`,
      );

      if (newFound.length === groups.length) {
        for (const participant of session.participants) {
          addPoints(session, participant, BONUS_POINTS_ON_COMPLETE);
        }
        addEvent(
          session,
          `All groups found! Everyone gets +${BONUS_POINTS_ON_COMPLETE} bonus pts.`,
        );
        session.round += 1;
        initializePuzzle(session, { users: session.participants } as RoomData);
        addEvent(session, `Round ${session.round} started — new puzzle!`);
      }
    } else {
      const remaining = (session.teamThreadsLives ?? 1) - 1;
      session.teamThreadsLives = remaining;
      addEvent(
        session,
        `${userName}'s guess was wrong. ${remaining} ${remaining === 1 ? 'life' : 'lives'} remaining.`,
      );

      if (remaining <= 0) {
        const unfound = groups.filter((g) => !foundCategories.has(g.category));
        for (const group of unfound) {
          addEvent(
            session,
            `"${group.category}" was: ${group.words.join(', ')}.`,
          );
        }
        session.status = 'completed';
        const topScore = Math.max(...Object.values(session.leaderboard));
        const winner = Object.entries(session.leaderboard).find(
          ([, score]) => score === topScore,
        )?.[0];
        if (winner) session.winner = winner;
      }
    }
  },
};
