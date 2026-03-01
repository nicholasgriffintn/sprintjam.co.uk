import type { RoomGameSession } from '@sprintjam/types';

import type { GameEngine } from '../types';
import { addEvent, addPoints } from '../helpers';

const TURNS_PER_PLAYER = 3;
const DICE_COUNT = 6;

const rollDie = () => Math.floor(Math.random() * 6) + 1;

export const scoreDice = (dice: number[]): number => {
  if (dice.length === 0) return 0;

  const counts: Record<number, number> = {};
  for (const d of dice) counts[d] = (counts[d] ?? 0) + 1;

  const faces = Object.keys(counts).map(Number);

  const straight = dice.length === 6 && faces.length === 6;
  if (straight) {
    return 1500;
  }

  const threePairs =
    dice.length === 6 && Object.values(counts).every((c) => c === 2);
  if (threePairs) {
    return 750;
  }

  let score = 0;
  for (const face of faces) {
    const count = counts[face];
    if (count >= 3) {
      const base = face === 1 ? 1000 : face * 100;
      const multiplier = Math.pow(2, count - 3);
      score += base * multiplier;
    } else {
      if (face === 1) score += count * 100;
      if (face === 5) score += count * 50;
    }
  }
  return score;
};

const hasScoringDice = (dice: number[]): boolean => {
  const noScore = dice.length === 0;
  if (noScore) {
    return false;
  }

  const onesOrFives = dice.some((d) => d === 1 || d === 5);
  if (onesOrFives) {
    return true;
  }
  const counts: Record<number, number> = {};
  for (const d of dice) counts[d] = (counts[d] ?? 0) + 1;

  const threeOrMoreOfAKind = Object.values(counts).some((c) => c >= 3);
  if (threeOrMoreOfAKind) {
    return true;
  }

  const straight = dice.length === 6 && Object.keys(counts).length === 6;
  if (straight) {
    return true;
  }

  const threePairs =
    dice.length === 6 && Object.values(counts).every((c) => c === 2);
  if (threePairs) {
    return true;
  }

  return false;
};

const getCurrentPlayer = (session: RoomGameSession): string | undefined => {
  const order = session.sprintRiskTurnOrder ?? [];
  return order[(session.sprintRiskTurnIndex ?? 0) % order.length];
};

const advanceTurn = (session: RoomGameSession) => {
  const order = session.sprintRiskTurnOrder ?? [];
  session.sprintRiskTurnIndex =
    ((session.sprintRiskTurnIndex ?? 0) + 1) % order.length;
  session.sprintRiskDice = Array(DICE_COUNT).fill(null);
  session.sprintRiskKeptIndices = [];
  session.sprintRiskTurnScore = 0;
  session.sprintRiskPhase = 'waiting';
};

const checkGameOver = (session: RoomGameSession): boolean => {
  const turnCount = session.sprintRiskTurnCount ?? {};
  return session.participants.every(
    (p) => (turnCount[p] ?? 0) >= TURNS_PER_PLAYER,
  );
};

export const sprintRiskEngine: GameEngine = {
  title: 'Sprint Risk',
  allowConsecutiveMoves: true,
  shouldBlockConsecutiveMoves: () => false,
  canStart: (roomData) =>
    roomData.users.length < 2
      ? 'Sprint Risk needs at least 2 players.'
      : undefined,
  initializeSessionState: (roomData) => ({
    sprintRiskTurnOrder: [...roomData.users],
    sprintRiskTurnIndex: 0,
    sprintRiskDice: Array(DICE_COUNT).fill(null),
    sprintRiskKeptIndices: [],
    sprintRiskTurnScore: 0,
    sprintRiskPhase: 'waiting' as const,
    sprintRiskTurnCount: roomData.users.reduce<Record<string, number>>(
      (acc, user) => ({ ...acc, [user]: 0 }),
      {},
    ),
  }),
  applyMove: ({ session, userName, value }) => {
    const currentPlayer = getCurrentPlayer(session);

    if (currentPlayer !== userName) {
      session.moves = session.moves.filter(
        (m) => !(m.user === userName && m.value === value),
      );
      return;
    }

    if (value === 'roll') {
      if (
        session.sprintRiskPhase !== 'waiting' &&
        session.sprintRiskPhase !== 'kept'
      ) {
        session.moves = session.moves.filter(
          (m) => !(m.user === userName && m.value === value),
        );
        return;
      }

      const keptIndices = new Set(session.sprintRiskKeptIndices ?? []);
      const currentDice =
        session.sprintRiskDice ?? Array(DICE_COUNT).fill(null);
      const newDice = currentDice.map((face, i) =>
        keptIndices.has(i) ? face : rollDie(),
      ) as number[];
      session.sprintRiskDice = newDice;

      const newlyRolled = newDice.filter((_, i) => !keptIndices.has(i));

      if (!hasScoringDice(newlyRolled)) {
        const turnScore = session.sprintRiskTurnScore ?? 0;
        addEvent(
          session,
          `Farkle! ${userName} loses ${turnScore > 0 ? turnScore + ' pts from this turn.' : 'their turn.'}`,
        );
        const turnCount = session.sprintRiskTurnCount ?? {};
        session.sprintRiskTurnCount = {
          ...turnCount,
          [userName]: (turnCount[userName] ?? 0) + 1,
        };
        advanceTurn(session);

        if (checkGameOver(session)) {
          session.status = 'completed';
          const topScore = Math.max(...Object.values(session.leaderboard));
          const winner = Object.entries(session.leaderboard).find(
            ([, score]) => score === topScore,
          )?.[0];
          if (winner) session.winner = winner;
          addEvent(session, `Game over! ${session.winner ?? 'No one'} wins.`);
        } else {
          const next = getCurrentPlayer(session);
          if (next) addEvent(session, `${next}'s turn.`);
        }
        return;
      }

      session.sprintRiskPhase = 'rolled';
    } else if (value.startsWith('keep:')) {
      if (session.sprintRiskPhase !== 'rolled') {
        session.moves = session.moves.filter(
          (m) => !(m.user === userName && m.value === value),
        );
        return;
      }

      const rawIndices = value
        .slice(5)
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n));

      const currentDice = session.sprintRiskDice ?? [];
      const alreadyKept = new Set(session.sprintRiskKeptIndices ?? []);
      const newKeepIndices = rawIndices.filter(
        (i) => i >= 0 && i < DICE_COUNT && !alreadyKept.has(i),
      );
      const keptDiceValues = newKeepIndices
        .map((i) => currentDice[i])
        .filter((v): v is number => v !== null && v !== undefined);

      if (keptDiceValues.length === 0 || scoreDice(keptDiceValues) === 0) {
        addEvent(
          session,
          `${userName}'s kept dice don't score — pick a valid combination.`,
        );
        session.moves = session.moves.filter(
          (m) => !(m.user === userName && m.value === value),
        );
        return;
      }

      const gained = scoreDice(keptDiceValues);
      const updatedKeptIndices = [
        ...(session.sprintRiskKeptIndices ?? []),
        ...newKeepIndices,
      ];
      session.sprintRiskKeptIndices = updatedKeptIndices;
      session.sprintRiskTurnScore = (session.sprintRiskTurnScore ?? 0) + gained;
      session.sprintRiskPhase = 'kept';
      addEvent(
        session,
        `${userName} kept ${keptDiceValues.join(', ')} (+${gained} pts, turn total: ${session.sprintRiskTurnScore}).`,
      );

      const hotDice = updatedKeptIndices.length === DICE_COUNT;
      if (hotDice) {
        addEvent(session, `Hot dice! ${userName} can re-roll all 6.`);
        session.sprintRiskKeptIndices = [];
        session.sprintRiskDice = Array(DICE_COUNT).fill(null);
        session.sprintRiskPhase = 'waiting';
      }
    } else if (value === 'bank') {
      if (session.sprintRiskPhase !== 'kept') {
        session.moves = session.moves.filter(
          (m) => !(m.user === userName && m.value === value),
        );
        return;
      }

      const banked = session.sprintRiskTurnScore ?? 0;
      addPoints(session, userName, banked);
      addEvent(session, `${userName} banked ${banked} pts.`);

      const turnCount = session.sprintRiskTurnCount ?? {};
      session.sprintRiskTurnCount = {
        ...turnCount,
        [userName]: (turnCount[userName] ?? 0) + 1,
      };
      advanceTurn(session);

      if (checkGameOver(session)) {
        session.status = 'completed';
        const topScore = Math.max(...Object.values(session.leaderboard));
        const winner = Object.entries(session.leaderboard).find(
          ([, score]) => score === topScore,
        )?.[0];
        if (winner) session.winner = winner;
        addEvent(session, `Game over! ${session.winner ?? 'No one'} wins.`);
      } else {
        const next = getCurrentPlayer(session);
        if (next) addEvent(session, `${next}'s turn.`);
      }
    }
  },
};
