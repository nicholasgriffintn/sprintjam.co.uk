import { describe, it, expect, vi, beforeEach } from "vitest";

const effects: Array<() => void | (() => void)> = [];

vi.mock("react", () => ({
  useEffect: (fn: () => void | (() => void)) => {
    const cleanup = fn();
    if (cleanup) {
      effects.push(cleanup);
    }
  },
  useRef: (val: any) => ({ current: val }),
}));

interface MutationMock {
  isPending: boolean;
  mutateAsync: ReturnType<typeof vi.fn>;
}

const useMutationMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useMutation: (...args: unknown[]) => useMutationMock(...args),
}));

vi.mock("@/lib/jira-service", () => ({
  updateJiraStoryPoints: vi.fn(),
}));

vi.mock("@/lib/linear-service", () => ({
  updateLinearEstimate: vi.fn(),
}));

import { useAutoEstimateUpdate } from "@/hooks/useAutoEstimateUpdate";

describe("useAutoEstimateUpdate", () => {
  let jiraMutation: MutationMock;
  let linearMutation: MutationMock;

  beforeEach(() => {
    effects.splice(0, effects.length);
    useMutationMock.mockReset();

    jiraMutation = {
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue({}),
    };
    linearMutation = {
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue({}),
    };

    useMutationMock
      .mockReturnValueOnce(jiraMutation)
      .mockReturnValueOnce(linearMutation);
  });

  it("skips mutation when a request is already pending", () => {
    jiraMutation.isPending = true;

    useAutoEstimateUpdate({
      roomData: {
        key: "r1",
        users: ["alice"],
        votes: { alice: 5 },
        judgeScore: 0,
        connectedUsers: {},
        showVotes: true,
        moderator: "alice",
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
          judgeAlgorithm: "simpleAverage",
          externalService: "jira",
          autoSyncEstimates: true,
        },
        currentTicket: {
          id: 1,
          ticketId: "ABC-1",
          status: "in_progress",
          ordinal: 1,
          createdAt: Date.now(),
          externalService: "jira",
        },
      },
      userName: "alice",
      onTicketUpdate: vi.fn(),
      onError: vi.fn(),
    });

    expect(jiraMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it("auto-syncs Jira ticket when enabled", async () => {
    const onTicketUpdate = vi.fn();
    jiraMutation.mutateAsync.mockResolvedValueOnce({ key: "ABC-1" });

    useAutoEstimateUpdate({
      roomData: {
        key: "r1",
        users: ["alice"],
        votes: { alice: 5 },
        judgeScore: 0,
        connectedUsers: {},
        showVotes: true,
        moderator: "alice",
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
          judgeAlgorithm: "simpleAverage",
          externalService: "jira",
          autoSyncEstimates: true,
        },
        currentTicket: {
          id: 1,
          ticketId: "ABC-1",
          status: "in_progress",
          ordinal: 1,
          createdAt: Date.now(),
          externalService: "jira",
        },
      },
      userName: "alice",
      onTicketUpdate,
      onError: vi.fn(),
    });

    await Promise.resolve();

    expect(jiraMutation.mutateAsync).toHaveBeenCalledWith({
      roomKey: "r1",
      storyPoints: 5,
      ticketId: "ABC-1",
    });
    expect(onTicketUpdate).toHaveBeenCalledWith(1, {
      externalServiceMetadata: { key: "ABC-1" },
    });
  });

  it("auto-syncs Linear ticket using fallback issue id", async () => {
    const onTicketUpdate = vi.fn();
    linearMutation.mutateAsync.mockResolvedValueOnce({ id: "lin-123" });

    useAutoEstimateUpdate({
      roomData: {
        key: "r2",
        users: ["bob"],
        votes: { bob: 3 },
        judgeScore: 0,
        connectedUsers: {},
        showVotes: true,
        moderator: "bob",
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
          judgeAlgorithm: "simpleAverage",
          externalService: "linear",
          autoSyncEstimates: true,
        },
        currentTicket: {
          id: 7,
          ticketId: "LIN-7",
          status: "in_progress",
          ordinal: 1,
          createdAt: Date.now(),
          externalService: "linear",
          externalServiceMetadata: { id: "issue-1" },
        },
      },
      userName: "bob",
      onTicketUpdate,
      onError: vi.fn(),
    });

    await Promise.resolve();

    expect(linearMutation.mutateAsync).toHaveBeenCalledWith({
      estimate: 3,
      issueId: "issue-1",
      roomKey: "r2",
    });
    expect(onTicketUpdate).toHaveBeenCalledWith(7, {
      externalServiceMetadata: { id: "lin-123" },
    });
  });

  it("does not sync unsupported providers even when auto-sync enabled", () => {
    const onTicketUpdate = vi.fn();

    useAutoEstimateUpdate({
      roomData: {
        key: "r3",
        users: ["cora"],
        votes: { cora: 8 },
        judgeScore: 0,
        connectedUsers: {},
        showVotes: true,
        moderator: "cora",
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
          judgeAlgorithm: "simpleAverage",
          externalService: "github",
          autoSyncEstimates: true,
        },
        currentTicket: {
          id: 9,
          ticketId: "42",
          status: "in_progress",
          ordinal: 1,
          createdAt: Date.now(),
          externalService: "github",
        },
      },
      userName: "cora",
      onTicketUpdate,
      onError: vi.fn(),
    });

    expect(jiraMutation.mutateAsync).not.toHaveBeenCalled();
    expect(linearMutation.mutateAsync).not.toHaveBeenCalled();
  });
});
