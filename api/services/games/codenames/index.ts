import type {
  CodenamesCardType,
  CodenamesState,
  CodenamesTeam,
} from '../../../types';
import { CODENAMES_WORDS } from './words';

const BOARD_SIZE = 25;
const STARTING_TEAM_COUNT = 9;
const OTHER_TEAM_COUNT = 8;
const NEUTRAL_COUNT = 7;
const ASSASSIN_COUNT = 1;

function getRandomInt(max: number): number {
  if (max <= 0) return 0;
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return Math.floor((array[0] / (0xffffffff + 1)) * max);
  }
  return Math.floor(Math.random() * max);
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = getRandomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function splitTeams(users: string[]): { red: string[]; blue: string[] } {
  const sorted = [...users].sort((a, b) => a.localeCompare(b));
  const red: string[] = [];
  const blue: string[] = [];

  sorted.forEach((user, idx) => {
    if (idx % 2 === 0) {
      red.push(user);
    } else {
      blue.push(user);
    }
  });

  return { red, blue };
}

export function generateBoard(): {
  board: string[];
  assignments: CodenamesCardType[];
  startingTeam: CodenamesTeam;
} {
  const pool = shuffle(CODENAMES_WORDS);
  const board = pool.slice(0, BOARD_SIZE);

  const startingTeam: CodenamesTeam = getRandomInt(2) === 0 ? 'red' : 'blue';
  const otherTeam: CodenamesTeam = startingTeam === 'red' ? 'blue' : 'red';

  const assignments: CodenamesCardType[] = shuffle([
    ...Array(ASSASSIN_COUNT).fill('assassin'),
    ...Array(STARTING_TEAM_COUNT).fill(startingTeam),
    ...Array(OTHER_TEAM_COUNT).fill(otherTeam),
    ...Array(NEUTRAL_COUNT).fill('neutral'),
  ]);

  return { board, assignments, startingTeam };
}

export function calculateRemaining(
  assignments: CodenamesCardType[],
  revealed: boolean[]
): { red: number; blue: number } {
  return assignments.reduce(
    (acc, assignment, idx) => {
      if (revealed[idx]) {
        return acc;
      }
      if (assignment === 'red') acc.red += 1;
      if (assignment === 'blue') acc.blue += 1;
      return acc;
    },
    { red: 0, blue: 0 }
  );
}

export function getOppositeTeam(team: CodenamesTeam): CodenamesTeam {
  return team === 'red' ? 'blue' : 'red';
}

export function buildNewCodenamesState(
  users: string[],
  startedBy: string
): CodenamesState {
  const { board, assignments, startingTeam } = generateBoard();
  const revealed = Array(board.length).fill(false);
  const teams = splitTeams(users);
  const remaining = calculateRemaining(assignments, revealed);
  const spymasters: Record<string, CodenamesTeam> = {};
  if (teams.red[0]) {
    spymasters[teams.red[0]] = 'red';
  }
  if (teams.blue[0]) {
    spymasters[teams.blue[0]] = 'blue';
  }

  return {
    board,
    assignments,
    revealed,
    activeTeam: startingTeam,
    startingTeam,
    remaining,
    version: 1,
    winner: undefined,
    startedBy,
    startedAt: Date.now(),
    teams,
    spymasters,
    clueWord: null,
    clueCount: null,
    guessesRemaining: null,
    guessesTaken: 0,
  };
}
