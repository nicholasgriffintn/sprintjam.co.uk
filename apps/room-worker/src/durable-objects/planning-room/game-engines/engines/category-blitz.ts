import type { RoomGameSession } from '@sprintjam/types';

import {
  addEvent,
  addPoints,
  assignNextCategoryBlitzPrompt,
  getCurrentRoundMoveCount,
  getCurrentRoundMoves,
  getRoundSubmissionCounts,
} from '../helpers';
import type { GameEngine } from '../types';

const CATEGORY_ANSWER_PATTERN = /^[a-z][a-z0-9 -]{0,30}$/i;

const normalizeCategoryAnswer = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, ' ');

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
  const counts = getRoundSubmissionCounts(session, normalizeCategoryAnswer);

  roundMoves.forEach((roundMove) => {
    const normalized = normalizeCategoryAnswer(roundMove.value);
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

export const categoryBlitzEngine: GameEngine = {
  title: 'Category Blitz',
  maxRounds: 3,
  initializeSessionState: () => {
    const sessionState: Partial<RoomGameSession> = {
      categoryBlitzHistory: [],
    };
    assignNextCategoryBlitzPrompt(sessionState);
    return sessionState;
  },
  applyMove: ({ session, userName, value, move }) => {
    const normalized = normalizeCategoryAnswer(value);
    const letter = (session.categoryBlitzLetter ?? '').toLowerCase();

    const isValidSubmission =
      !!normalized &&
      CATEGORY_ANSWER_PATTERN.test(value.trim()) &&
      !!letter &&
      normalized.startsWith(letter);

    if (!isValidSubmission) {
      session.moves = session.moves.slice(0, -1);
      addEvent(
        session,
        `${userName} submitted an invalid answer. Use ${letter.toUpperCase()} as the starting letter.`,
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

    addEvent(session, `${userName} locked in "${normalized}".`);

    if (getCurrentRoundMoveCount(session) >= session.participants.length) {
      scoreUniquenessRound(session, 3, 1);
      addEvent(
        session,
        `Round ${session.round} scored. Unique answers earned +3, duplicates +1.`,
      );
      session.round += 1;
      assignNextCategoryBlitzPrompt(session);
    }
  },
};
