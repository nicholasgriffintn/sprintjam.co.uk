import { describe, it, expect, beforeEach } from 'vitest';

import type {
  CodenamesState,
  RoomData,
  BroadcastMessage,
} from '../../../types';
import {
  handleStartCodenames,
  handleCodenamesClue,
  handleRevealCodenames,
  handleCodenamesPass,
  handleEndCodenames,
} from './codenames';
import { JudgeAlgorithm } from '../../../types';

type FakeRoom = ReturnType<typeof createFakeRoom>;

function baseRoomData(): RoomData {
  return {
    key: 'ROOM',
    users: ['alice', 'bob', 'carol', 'dave'],
    votes: {},
    structuredVotes: {},
    showVotes: false,
    moderator: 'alice',
    connectedUsers: { alice: true, bob: true, carol: true, dave: true },
    settings: {
      estimateOptions: [1, 2],
      allowOthersToShowEstimates: true,
      allowOthersToDeleteEstimates: true,
      allowOthersToManageQueue: true,
      showTimer: false,
      showUserPresence: true,
      showAverage: true,
      showMedian: false,
      showTopVotes: false,
      topVotesCount: 0,
      anonymousVotes: false,
      enableJudge: false,
      judgeAlgorithm: JudgeAlgorithm.SIMPLE_AVERAGE,
      externalService: 'none',
    },
  };
}

function createFakeRoom(roomData: RoomData) {
  let currentRoomData = roomData;
  const broadcasts: BroadcastMessage[] = [];

  return {
    sessions: new Map(),
    broadcast(message: BroadcastMessage) {
      broadcasts.push(message);
    },
    get broadcasts() {
      return broadcasts;
    },
    state: {
      async blockConcurrencyWhile<T>(cb: () => Promise<T>) {
        return cb();
      },
    },
    async getRoomData() {
      return currentRoomData;
    },
    async putRoomData(next: RoomData) {
      currentRoomData = next;
    },
    get data() {
      return currentRoomData;
    },
  };
}

describe('codenames handlers', () => {
  let room: FakeRoom;

  beforeEach(() => {
    room = createFakeRoom(baseRoomData());
  });

  it('only moderator can start; assigns spymasters and redacts broadcast', async () => {
    await handleStartCodenames(room as any, 'bob');
    expect(room.data.codenamesState).toBeUndefined();

    await handleStartCodenames(room as any, 'alice');
    const state = room.data.codenamesState as CodenamesState;
    expect(state).toBeDefined();
    expect(Object.values(state.spymasters)).toContain('red');
    expect(Object.values(state.spymasters)).toContain('blue');

    const lastBroadcast = room.broadcasts[room.broadcasts.length - 1];
    expect(lastBroadcast?.type).toBe('codenamesState');
    // assignments should be redacted in broadcast
    expect((lastBroadcast as any).codenamesState?.assignments).toBeUndefined();
  });

  it('spymaster only clue; sets guessesRemaining to count+1', async () => {
    await handleStartCodenames(room as any, 'alice');
    const state = room.data.codenamesState as CodenamesState;
    state.activeTeam = 'red';
    state.spymasters = { alice: 'red', bob: 'blue' };
    await room.putRoomData({ ...room.data, codenamesState: state });
    const redSpymaster = 'alice';

    await handleCodenamesClue(room as any, 'bob', 'tree', 2);
    expect(room.data.codenamesState?.clueWord).toBeNull();

    await handleCodenamesClue(room as any, redSpymaster, 'tree', 2);
    expect(room.data.codenamesState?.clueWord).toBe('tree');
    expect(room.data.codenamesState?.guessesRemaining).toBe(3);
  });

  it('guess flow enforces team turn, clue presence, and decrements guesses', async () => {
    await handleStartCodenames(room as any, 'alice');
    const state = room.data.codenamesState as CodenamesState;
    // deterministically set assignments/board for testing
    state.board = Array.from({ length: 5 }, (_, i) => `word-${i}`);
    state.assignments = ['red', 'blue', 'neutral', 'assassin', 'red'];
    state.activeTeam = 'red';
    state.teams = { red: ['alice', 'carol'], blue: ['bob', 'dave'] };
    state.spymasters = { alice: 'red', bob: 'blue' };
    await room.putRoomData({ ...room.data, codenamesState: state });

    await handleCodenamesClue(room as any, 'alice', 'fruit', 1);
    expect(room.data.codenamesState?.guessesRemaining).toBe(2);

    // non-active team cannot guess
    await handleRevealCodenames(room as any, 'bob', 0);
    expect(room.data.codenamesState?.revealed[0]).toBe(false);

    // spymaster cannot guess
    await handleRevealCodenames(room as any, 'alice', 0);
    expect(room.data.codenamesState?.revealed[0]).toBe(false);

    // active guesser reveals red -> stays turn, decrements guesses
    await handleRevealCodenames(room as any, 'carol', 0);
    expect(room.data.codenamesState?.revealed[0]).toBe(true);
    expect(room.data.codenamesState?.guessesRemaining).toBe(1);
    expect(room.data.codenamesState?.activeTeam).toBe('red');

    // second red guess uses final allowed guess -> should flip turn after consume
    await handleRevealCodenames(room as any, 'carol', 4);
    expect(room.data.codenamesState?.winner).toBe('red');
  });

  it('assassin ends game for guessing team', async () => {
    await handleStartCodenames(room as any, 'alice');
    const state = room.data.codenamesState as CodenamesState;
    state.board = ['a'];
    state.assignments = ['assassin'];
    state.activeTeam = 'red';
    state.teams = { red: ['carol', 'erin'], blue: ['bob'] };
    state.spymasters = { carol: 'red', bob: 'blue' };
    await room.putRoomData({ ...room.data, codenamesState: state });
    await handleCodenamesClue(room as any, 'carol', 'boom', 0);

    await handleRevealCodenames(room as any, 'erin', 0);
    expect(room.data.codenamesState?.winner).toBe('blue');
    expect(room.data.codenamesState?.guessesRemaining).toBe(0);
  });

  it('pass flips turn and clears clue', async () => {
    await handleStartCodenames(room as any, 'alice');
    const state = room.data.codenamesState as CodenamesState;
    state.activeTeam = 'red';
    state.teams = { red: ['carol'], blue: ['bob'] };
    state.spymasters = { carol: 'red', bob: 'blue' };
    await room.putRoomData({ ...room.data, codenamesState: state });
    await handleCodenamesClue(room as any, 'carol', 'sky', 2);
    expect(room.data.codenamesState?.activeTeam).toBe('red');

    await handleCodenamesPass(room as any, 'carol');
    expect(room.data.codenamesState?.activeTeam).toBe('blue');
    expect(room.data.codenamesState?.clueWord).toBeNull();
    expect(room.data.codenamesState?.guessesRemaining).toBeNull();
  });

  it('only moderator can end and wipes state', async () => {
    await handleStartCodenames(room as any, 'alice');
    await handleEndCodenames(room as any, 'bob');
    expect(room.data.codenamesState).toBeDefined();

    await handleEndCodenames(room as any, 'alice');
    expect(room.data.codenamesState).toBeUndefined();
    const last = room.broadcasts[room.broadcasts.length - 1];
    expect(last?.type).toBe('codenamesState');
    expect((last as any).codenamesState).toBeUndefined();
  });
});
