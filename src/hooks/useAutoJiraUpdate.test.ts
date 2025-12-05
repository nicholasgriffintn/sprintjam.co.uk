import { describe, it, expect, vi, beforeEach } from 'vitest';

const effects: Array<() => void | (() => void)> = [];

vi.mock('react', () => ({
  useEffect: (fn: () => void | (() => void)) => {
    const cleanup = fn();
    if (cleanup) {
      effects.push(cleanup);
    }
  },
  useRef: (val: any) => ({ current: val }),
}));

const mutateAsync = vi.fn();
const useMutationMock = vi.fn().mockReturnValue({
  isPending: false,
  mutateAsync,
});

vi.mock('@tanstack/react-query', () => ({
  useMutation: () => useMutationMock(),
}));

vi.mock('@/lib/jira-service', () => ({
  updateJiraStoryPoints: vi.fn(),
  convertVoteValueToStoryPoints: (val: any) =>
    typeof val === 'number' ? val : Number(val),
}));

import { useAutoJiraUpdate } from './useAutoJiraUpdate';

describe('useAutoJiraUpdate', () => {
  beforeEach(() => {
    effects.splice(0, effects.length);
    mutateAsync.mockClear();
    useMutationMock.mockClear();
  });

  it('skips mutation when a request is already pending', () => {
    useMutationMock.mockReturnValueOnce({ isPending: true, mutateAsync });

    useAutoJiraUpdate({
      roomData: {
        key: 'r1',
        users: ['alice'],
        votes: { alice: 5 },
        connectedUsers: {},
        showVotes: true,
        moderator: 'alice',
        settings: {
          estimateOptions: [1, 2, 3, 5],
          allowOthersToShowEstimates: false,
          allowOthersToDeleteEstimates: false,
          showTimer: false,
          showUserPresence: false,
          showAverage: false,
          showMedian: false,
          showTopVotes: false,
          topVotesCount: 0,
          anonymousVotes: false,
          enableJudge: false,
          judgeAlgorithm: 'simpleAverage',
          externalService: 'jira',
          autoUpdateJiraStoryPoints: true,
        },
        currentTicket: {
          id: 1,
          ticketId: 'ABC-1',
          status: 'in_progress',
          ordinal: 1,
          createdAt: Date.now(),
          externalService: 'jira',
        },
      },
      userName: 'alice',
      onTicketUpdate: vi.fn(),
      onError: vi.fn(),
    });

    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
