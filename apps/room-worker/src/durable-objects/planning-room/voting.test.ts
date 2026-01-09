import { describe, it, expect, vi } from 'vitest';
import type {
  DurableObjectNamespace,
  Fetcher,
  RateLimit,
  DurableObjectState,
} from '@cloudflare/workers-types';
import type { RoomWorkerEnv, RoomData } from '@sprintjam/types';
import { createInitialRoomData } from '@sprintjam/utils';

import { PlanningRoom } from '.';

const makeState = () => {
  const sqlStub = {
    exec: vi.fn().mockReturnValue({ toArray: vi.fn().mockReturnValue([]) }),
  };

  return {
    storage: {
      sql: sqlStub as any,
      transactionSync: vi.fn((fn: () => void) => fn()),
      transaction: vi.fn(async (fn: (txn: any) => void) =>
        fn({ sql: sqlStub })
      ),
      get: vi.fn(),
      put: vi.fn(),
    },
    blockConcurrencyWhile: vi.fn(async (fn: () => Promise<void>) => fn()),
  } as unknown as DurableObjectState;
};

const env: RoomWorkerEnv = {
  PLANNING_ROOM: {} as DurableObjectNamespace,
  JOIN_RATE_LIMITER: {} as RateLimit,
  TOKEN_ENCRYPTION_SECRET: 'test-secret',
};

describe('PlanningRoom voting reveal settings', () => {
  describe('auto-reveal when everyone voted', () => {
    it('should auto-reveal votes when everyone has voted and setting is enabled', async () => {
      const state = makeState();
      const room = new PlanningRoom(state, env);
      const roomData: RoomData = createInitialRoomData({
        key: 'test-room',
        users: ['user1', 'user2'],
        moderator: 'user1',
        connectedUsers: { user1: true, user2: true },
        settings: {
          enableAutoReveal: true,
        },
      });

      const repository = {
        setVote: vi.fn(),
        setShowVotes: vi.fn(),
        setJudgeState: vi.fn(),
      } as unknown as PlanningRoom['repository'];

      room.repository = repository;
      room.broadcast = vi.fn();
      room.getRoomData = vi.fn(async () => roomData);
      room.calculateAndUpdateJudgeScore = vi.fn();

      await room.handleVote('user1', '5');
      expect(roomData.showVotes).toBe(false);

      await room.handleVote('user2', '8');
      expect(roomData.showVotes).toBe(true);
      expect(repository.setShowVotes).toHaveBeenCalledWith(true);
      expect(room.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'showVotes',
          showVotes: true,
        })
      );
    });

    it('should not auto-reveal when setting is disabled', async () => {
      const state = makeState();
      const room = new PlanningRoom(state, env);
      const roomData: RoomData = createInitialRoomData({
        key: 'test-room',
        users: ['user1', 'user2'],
        moderator: 'user1',
        connectedUsers: { user1: true, user2: true },
        settings: {
          enableAutoReveal: false,
        },
      });

      const repository = {
        setVote: vi.fn(),
        setShowVotes: vi.fn(),
      } as unknown as PlanningRoom['repository'];

      room.repository = repository;
      room.broadcast = vi.fn();
      room.getRoomData = vi.fn(async () => roomData);

      await room.handleVote('user1', '5');
      await room.handleVote('user2', '8');

      expect(roomData.showVotes).toBe(false);
      expect(repository.setShowVotes).not.toHaveBeenCalled();
    });

    it('should not auto-reveal if votes are already shown', async () => {
      const state = makeState();
      const room = new PlanningRoom(state, env);
      const roomData: RoomData = createInitialRoomData({
        key: 'test-room',
        users: ['user1', 'user2'],
        moderator: 'user1',
        connectedUsers: { user1: true, user2: true },
        settings: {
          enableAutoReveal: true,
        },
      });
      roomData.showVotes = true;

      const repository = {
        setVote: vi.fn(),
        setShowVotes: vi.fn(),
      } as unknown as PlanningRoom['repository'];

      room.repository = repository;
      room.broadcast = vi.fn();
      room.getRoomData = vi.fn(async () => roomData);

      await room.handleVote('user1', '5');
      await room.handleVote('user2', '8');

      expect(repository.setShowVotes).not.toHaveBeenCalledWith(true);
    });
  });

  describe('always-reveal mode', () => {
    it('should prevent hiding votes when always-reveal is enabled', async () => {
      const state = makeState();
      const room = new PlanningRoom(state, env);
      const roomData: RoomData = createInitialRoomData({
        key: 'test-room',
        users: ['user1'],
        moderator: 'user1',
        connectedUsers: { user1: true },
        settings: {
          alwaysRevealVotes: true,
        },
      });
      roomData.showVotes = true;

      const repository = {
        setShowVotes: vi.fn(),
      } as unknown as PlanningRoom['repository'];

      room.repository = repository;
      room.broadcast = vi.fn();
      room.getRoomData = vi.fn(async () => roomData);

      await room.handleShowVotes('user1');

      expect(roomData.showVotes).toBe(true);
      expect(repository.setShowVotes).not.toHaveBeenCalled();
    });

    it('should show votes when setting is enabled on creation', async () => {
      const roomData: RoomData = createInitialRoomData({
        key: 'test-room',
        users: ['user1'],
        moderator: 'user1',
        connectedUsers: { user1: true },
        settings: {
          alwaysRevealVotes: true,
        },
      });

      expect(roomData.showVotes).toBe(true);
    });

    it('should keep votes revealed after reset when always-reveal is enabled', async () => {
      const state = makeState();
      const room = new PlanningRoom(state, env);
      const roomData: RoomData = createInitialRoomData({
        key: 'test-room',
        users: ['user1'],
        moderator: 'user1',
        connectedUsers: { user1: true },
        settings: {
          alwaysRevealVotes: true,
        },
      });
      roomData.votes = { user1: '5' };
      roomData.showVotes = true;

      const repository = {
        clearVotes: vi.fn(),
        clearStructuredVotes: vi.fn(),
        setShowVotes: vi.fn(),
        setJudgeState: vi.fn(),
        updateTimerConfig: vi.fn(),
      } as unknown as PlanningRoom['repository'];

      room.repository = repository;
      room.broadcast = vi.fn();
      room.getRoomData = vi.fn(async () => roomData);

      await room.handleResetVotes('user1');

      expect(roomData.showVotes).toBe(true);
      expect(repository.setShowVotes).toHaveBeenCalledWith(true);
    });
  });

  describe('always-reveal and auto-reveal combined', () => {
    it('should work together when both enabled', async () => {
      const state = makeState();
      const room = new PlanningRoom(state, env);
      const roomData: RoomData = createInitialRoomData({
        key: 'test-room',
        users: ['user1', 'user2'],
        moderator: 'user1',
        connectedUsers: { user1: true, user2: true },
        settings: {
          enableAutoReveal: true,
          alwaysRevealVotes: true,
          allowVotingAfterReveal: true,
        },
      });
      roomData.showVotes = true;

      const repository = {
        setVote: vi.fn(),
        setShowVotes: vi.fn(),
        clearVotes: vi.fn(),
        clearStructuredVotes: vi.fn(),
        setJudgeState: vi.fn(),
        updateTimerConfig: vi.fn(),
      } as unknown as PlanningRoom['repository'];

      room.repository = repository;
      room.broadcast = vi.fn();
      room.getRoomData = vi.fn(async () => roomData);

      await room.handleVote('user1', '5');
      await room.handleVote('user2', '8');

      expect(roomData.showVotes).toBe(true);

      await room.handleResetVotes('user1');
      expect(roomData.showVotes).toBe(true);
    });
  });

  describe('auto-reveal with structured voting', () => {
    it('should auto-reveal when all users complete all 4 criteria', async () => {
      const state = makeState();
      const room = new PlanningRoom(state, env);
      const roomData: RoomData = createInitialRoomData({
        key: 'test-room',
        users: ['user1', 'user2'],
        moderator: 'user1',
        connectedUsers: { user1: true, user2: true },
        settings: {
          enableAutoReveal: true,
          enableStructuredVoting: true,
        },
      });

      const repository = {
        setVote: vi.fn(),
        setStructuredVote: vi.fn(),
        setShowVotes: vi.fn(),
        setJudgeState: vi.fn(),
      } as unknown as PlanningRoom['repository'];

      room.repository = repository;
      room.broadcast = vi.fn();
      room.getRoomData = vi.fn(async () => roomData);
      room.calculateAndUpdateJudgeScore = vi.fn();

      await room.handleVote('user1', {
        criteriaScores: {
          complexity: 2,
          confidence: 3,
          volume: 1,
          unknowns: 0,
        },
      });
      expect(roomData.showVotes).toBe(false);

      await room.handleVote('user2', {
        criteriaScores: {
          complexity: 3,
          confidence: 2,
          volume: 2,
          unknowns: 1,
        },
      });
      expect(roomData.showVotes).toBe(true);
      expect(repository.setShowVotes).toHaveBeenCalledWith(true);
    });

    it('should not auto-reveal when last user has incomplete vote (missing criteria)', async () => {
      const state = makeState();
      const room = new PlanningRoom(state, env);
      const roomData: RoomData = createInitialRoomData({
        key: 'test-room',
        users: ['user1', 'user2'],
        moderator: 'user1',
        connectedUsers: { user1: true, user2: true },
        settings: {
          enableAutoReveal: true,
          enableStructuredVoting: true,
        },
      });

      const repository = {
        setVote: vi.fn(),
        setStructuredVote: vi.fn(),
        setShowVotes: vi.fn(),
      } as unknown as PlanningRoom['repository'];

      room.repository = repository;
      room.broadcast = vi.fn();
      room.getRoomData = vi.fn(async () => roomData);

      await room.handleVote('user1', {
        criteriaScores: {
          complexity: 2,
          confidence: 3,
          volume: 1,
          unknowns: 0,
        },
      });

      await room.handleVote('user2', {
        criteriaScores: {
          complexity: 3,
          confidence: 2,
        },
      });

      expect(roomData.showVotes).toBe(false);
      expect(repository.setShowVotes).not.toHaveBeenCalled();
    });

    it('should not auto-reveal when first user has incomplete vote', async () => {
      const state = makeState();
      const room = new PlanningRoom(state, env);
      const roomData: RoomData = createInitialRoomData({
        key: 'test-room',
        users: ['user1', 'user2'],
        moderator: 'user1',
        connectedUsers: { user1: true, user2: true },
        settings: {
          enableAutoReveal: true,
          enableStructuredVoting: true,
        },
      });

      const repository = {
        setVote: vi.fn(),
        setStructuredVote: vi.fn(),
        setShowVotes: vi.fn(),
      } as unknown as PlanningRoom['repository'];

      room.repository = repository;
      room.broadcast = vi.fn();
      room.getRoomData = vi.fn(async () => roomData);

      await room.handleVote('user1', {
        criteriaScores: {
          complexity: 2,
        },
      });

      await room.handleVote('user2', {
        criteriaScores: {
          complexity: 3,
          confidence: 2,
          volume: 2,
          unknowns: 1,
        },
      });

      expect(roomData.showVotes).toBe(false);
      expect(repository.setShowVotes).not.toHaveBeenCalled();
    });

    it('should auto-reveal when all criteria are explicitly set to 0', async () => {
      const state = makeState();
      const room = new PlanningRoom(state, env);
      const roomData: RoomData = createInitialRoomData({
        key: 'test-room',
        users: ['user1', 'user2'],
        moderator: 'user1',
        connectedUsers: { user1: true, user2: true },
        settings: {
          enableAutoReveal: true,
          enableStructuredVoting: true,
        },
      });

      const repository = {
        setVote: vi.fn(),
        setStructuredVote: vi.fn(),
        setShowVotes: vi.fn(),
        setJudgeState: vi.fn(),
      } as unknown as PlanningRoom['repository'];

      room.repository = repository;
      room.broadcast = vi.fn();
      room.getRoomData = vi.fn(async () => roomData);
      room.calculateAndUpdateJudgeScore = vi.fn();

      await room.handleVote('user1', {
        criteriaScores: {
          complexity: 0,
          confidence: 0,
          volume: 0,
          unknowns: 0,
        },
      });

      await room.handleVote('user2', {
        criteriaScores: {
          complexity: 0,
          confidence: 0,
          volume: 0,
          unknowns: 0,
        },
      });

      expect(roomData.showVotes).toBe(true);
      expect(repository.setShowVotes).toHaveBeenCalledWith(true);
    });

    it('should auto-reveal in mixed mode when last user completes their vote', async () => {
      const state = makeState();
      const room = new PlanningRoom(state, env);
      const roomData: RoomData = createInitialRoomData({
        key: 'test-room',
        users: ['user1', 'user2', 'user3'],
        moderator: 'user1',
        connectedUsers: { user1: true, user2: true, user3: true },
        settings: {
          enableAutoReveal: true,
          enableStructuredVoting: true,
        },
      });

      const repository = {
        setVote: vi.fn(),
        setStructuredVote: vi.fn(),
        setShowVotes: vi.fn(),
        setJudgeState: vi.fn(),
      } as unknown as PlanningRoom['repository'];

      room.repository = repository;
      room.broadcast = vi.fn();
      room.getRoomData = vi.fn(async () => roomData);
      room.calculateAndUpdateJudgeScore = vi.fn();

      await room.handleVote('user1', {
        criteriaScores: {
          complexity: 2,
          confidence: 3,
          volume: 1,
          unknowns: 0,
        },
      });

      await room.handleVote('user2', {
        criteriaScores: {
          complexity: 1,
        },
      });
      expect(roomData.showVotes).toBe(false);

      await room.handleVote('user2', {
        criteriaScores: {
          complexity: 1,
          confidence: 4,
          volume: 2,
          unknowns: 0,
        },
      });
      expect(roomData.showVotes).toBe(false);

      await room.handleVote('user3', {
        criteriaScores: {
          complexity: 3,
          confidence: 2,
          volume: 2,
          unknowns: 1,
        },
      });
      expect(roomData.showVotes).toBe(true);
    });
  });
});
