/**
 * @vitest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sessionStatsQueryKey } from "@/lib/workspace-query";
import type { SessionStats, TeamSession } from "@sprintjam/types";

const getBatchSessionStats = vi.fn();

vi.mock("@/lib/workspace-service", () => ({
  getBatchSessionStats: (...args: unknown[]) => getBatchSessionStats(...args),
}));

import { useSessionStats } from "@/hooks/useSessionStats";

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const sessions: TeamSession[] = [
  {
    id: 1,
    teamId: 12,
    roomKey: "ROOM-1",
    name: "Sprint planning",
    createdById: 4,
    createdAt: 1_700_000_000_000,
    completedAt: 1_700_000_360_000,
    metadata: null,
  },
];

const sessionStats: SessionStats = {
  roomKey: "ROOM-1",
  totalRounds: 6,
  totalVotes: 24,
  uniqueParticipants: 4,
  participationRate: 100,
  consensusRate: 75,
  firstRoundConsensusRate: 50,
  discussionRate: 25,
  estimationVelocity: 8,
  durationMinutes: 32,
};

describe("useSessionStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("deduplicates matching requests and seeds per-session cache", async () => {
    getBatchSessionStats.mockResolvedValue({ "ROOM-1": sessionStats });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    const wrapper = createWrapper(queryClient);

    const first = renderHook(() => useSessionStats(sessions), { wrapper });
    const second = renderHook(() => useSessionStats(sessions), { wrapper });

    await waitFor(() => {
      expect(first.result.current.statsMap["ROOM-1"]).toEqual(sessionStats);
    });

    expect(second.result.current.statsMap["ROOM-1"]).toEqual(sessionStats);
    expect(getBatchSessionStats).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(sessionStatsQueryKey("ROOM-1"))).toEqual(
      sessionStats,
    );
  });
});
