import { beforeEach, describe, expect, it, vi } from 'vitest';

import { roundVotes, voteRecords } from '@sprintjam/db/d1/schemas';
import { drizzle } from 'drizzle-orm/d1';

import { StatsRepository } from './stats';

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(),
}));

describe('StatsRepository ingestRound', () => {
  let mockD1: { batch: ReturnType<typeof vi.fn>; prepare: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockD1 = {
      batch: vi.fn().mockResolvedValue(undefined),
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({})),
      })),
    };
  });

  it('skips duplicate rounds without updating stats', async () => {
    const insert = vi.fn((table) => {
      if (table === roundVotes) {
        const returning = vi.fn().mockResolvedValue([]);
        const onConflictDoNothing = vi.fn(() => ({ returning }));
        const values = vi.fn(() => ({ onConflictDoNothing }));
        return { values };
      }
      if (table === voteRecords) {
        throw new Error('voteRecords insert should not be called');
      }
      throw new Error('Unexpected insert table');
    });

    vi.mocked(drizzle).mockReturnValue({ insert } as any);

    const repo = new StatsRepository(mockD1 as any);
    await repo.ingestRound({
      roomKey: 'room1',
      roundId: 'round-1',
      votes: [{ userName: 'alice', vote: '5', votedAt: 1 }],
      roundEndedAt: 2,
    });

    expect(insert).toHaveBeenCalledWith(roundVotes);
    expect(mockD1.batch).not.toHaveBeenCalled();
  });

  it('records votes and updates stats when round is new', async () => {
    const insert = vi.fn((table) => {
      if (table === roundVotes) {
        const returning = vi.fn().mockResolvedValue([{ roundId: 'round-1' }]);
        const onConflictDoNothing = vi.fn(() => ({ returning }));
        const values = vi.fn(() => ({ onConflictDoNothing }));
        return { values };
      }
      if (table === voteRecords) {
        const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
        const values = vi.fn(() => ({ onConflictDoNothing }));
        return { values };
      }
      throw new Error('Unexpected insert table');
    });

    vi.mocked(drizzle).mockReturnValue({ insert } as any);

    const repo = new StatsRepository(mockD1 as any);
    await repo.ingestRound({
      roomKey: 'room1',
      roundId: 'round-1',
      votes: [{ userName: 'alice', vote: '5', votedAt: 1 }],
      roundEndedAt: 2,
    });

    expect(insert).toHaveBeenCalledWith(roundVotes);
    expect(insert).toHaveBeenCalledWith(voteRecords);
    expect(mockD1.batch).toHaveBeenCalled();
  });
});
