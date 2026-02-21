import type { RoomGameSession } from "@sprintjam/types";

import {
  addEvent,
  addPoints,
  assignNextOneWordPitchPrompt,
  getCurrentRoundMoveCount,
} from "../helpers";
import type { GameEngine } from "../types";

const ONE_WORD_PATTERN = /^[a-z][a-z0-9-]{0,23}$/i;
const VOTE_PREFIX = "vote:";

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
  submissions: Record<string, string>,
  uniquePoints: number,
  duplicatePoints: number,
) => {
  const counts = new Map<string, number>();

  Object.values(submissions).forEach((word) => {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  });

  Object.entries(submissions).forEach(([user, word]) => {
    const isUnique = (counts.get(word) ?? 0) === 1;
    addPoints(session, user, isUnique ? uniquePoints : duplicatePoints);
  });
};

const findParticipantByName = (session: RoomGameSession, candidate: string) => {
  const normalized = candidate.trim().toLowerCase();
  return session.participants.find(
    (participant) => participant.toLowerCase() === normalized,
  );
};

const parseVoteTarget = (session: RoomGameSession, value: string) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized.startsWith(VOTE_PREFIX)) {
    return undefined;
  }

  const candidate = value.trim().slice(VOTE_PREFIX.length);
  if (!candidate.trim()) {
    return undefined;
  }

  return findParticipantByName(session, candidate);
};

const finalizeRound = (
  session: RoomGameSession,
  options?: { votes?: Record<string, string>; voteWinners?: string[] },
) => {
  const submissions = { ...(session.oneWordPitchRoundSubmissions ?? {}) };

  session.oneWordPitchRoundHistory = [
    ...(session.oneWordPitchRoundHistory ?? []),
    {
      round: session.round,
      prompt: session.oneWordPitchPrompt ?? "",
      submissions,
      votes: options?.votes,
      voteWinners: options?.voteWinners,
    },
  ].slice(-6);

  session.round += 1;
  session.oneWordPitchPhase = "submit";
  session.oneWordPitchRoundSubmissions = {};
  session.oneWordPitchRoundVotes = {};
  assignNextOneWordPitchPrompt(session);
};

export const oneWordPitchEngine: GameEngine = {
  title: "One-Word Pitch",
  maxRounds: 3,
  shouldBlockConsecutiveMoves: () => false,
  initializeSessionState: () => {
    const sessionState: Partial<RoomGameSession> = {
      oneWordPitchPromptHistory: [],
      oneWordPitchPhase: "submit",
      oneWordPitchRoundSubmissions: {},
      oneWordPitchRoundVotes: {},
      oneWordPitchRoundHistory: [],
    };
    assignNextOneWordPitchPrompt(sessionState);
    return sessionState;
  },
  applyMove: ({ session, userName, value, move }) => {
    const phase = session.oneWordPitchPhase ?? "submit";

    if (phase === "submit") {
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

      session.oneWordPitchRoundSubmissions = {
        ...(session.oneWordPitchRoundSubmissions ?? {}),
        [userName]: normalized,
      };

      addEvent(session, `${userName} pitched a word.`);

      if (getCurrentRoundMoveCount(session) < session.participants.length) {
        return;
      }

      const submissions = { ...(session.oneWordPitchRoundSubmissions ?? {}) };
      scoreUniquenessRound(session, submissions, 3, 1);

      if (session.participants.length < 2) {
        addEvent(
          session,
          `Round ${session.round} scored. Unique words earned +3, duplicates +1.`,
        );
        finalizeRound(session);
        return;
      }

      session.oneWordPitchPhase = "vote";
      session.oneWordPitchRoundVotes = {};
      addEvent(
        session,
        `Round ${session.round} scored. Unique words earned +3, duplicates +1. Vote now for bonus points (vote:<player>).`,
      );
      return;
    }

    const voteTarget = parseVoteTarget(session, value);
    if (!voteTarget) {
      session.moves = session.moves.slice(0, -1);
      addEvent(
        session,
        `${userName} entered an invalid vote. Use vote:<player name>.`,
      );
      return;
    }

    const submissions = session.oneWordPitchRoundSubmissions ?? {};
    if (!submissions[voteTarget]) {
      session.moves = session.moves.slice(0, -1);
      addEvent(session, `${userName} voted for a player without a submission.`);
      return;
    }

    if (voteTarget === userName) {
      session.moves = session.moves.slice(0, -1);
      addEvent(session, `${userName} cannot vote for themselves.`);
      return;
    }

    const existingVotes = session.oneWordPitchRoundVotes ?? {};
    if (existingVotes[userName]) {
      session.moves = session.moves.slice(0, -1);
      addEvent(session, `${userName} already voted this round.`);
      return;
    }

    session.oneWordPitchRoundVotes = {
      ...existingVotes,
      [userName]: voteTarget,
    };
    addEvent(session, `${userName} cast a vote.`);

    if (
      Object.keys(session.oneWordPitchRoundVotes).length <
      session.participants.length
    ) {
      return;
    }

    const tally = new Map<string, number>();
    Object.values(session.oneWordPitchRoundVotes).forEach((target) => {
      tally.set(target, (tally.get(target) ?? 0) + 1);
    });

    const maxVotes = Math.max(0, ...tally.values());
    const voteWinners = Array.from(tally.entries())
      .filter(([, count]) => count === maxVotes && count > 0)
      .map(([user]) => user);

    voteWinners.forEach((winner) => {
      addPoints(session, winner, 2);
    });

    addEvent(
      session,
      voteWinners.length > 0
        ? `Bonus vote winners: ${voteWinners.join(", ")} (+2 each).`
        : "No bonus vote winners this round.",
    );

    finalizeRound(session, {
      votes: { ...session.oneWordPitchRoundVotes },
      voteWinners,
    });
  },
};
