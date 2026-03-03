/**
 * @vitest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TeamInsights } from "@sprintjam/types";

const getTeamInsights = vi.fn();

vi.mock("@/lib/workspace-service", () => ({
  getTeamInsights: (...args: unknown[]) => getTeamInsights(...args),
}));

import { TeamInsightsPanel } from "@/components/workspace/TeamInsightsPanel";

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const insights: TeamInsights = {
  sessionsAnalyzed: 4,
  totalTickets: 18,
  totalRounds: 22,
  participationRate: 96,
  firstRoundConsensusRate: 61,
  discussionRate: 39,
  estimationVelocity: 7.5,
  questionMarkRate: 8,
};

describe("TeamInsightsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deduplicates matching team insight requests", async () => {
    getTeamInsights.mockResolvedValue(insights);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <>
        <TeamInsightsPanel teamId={7} teamName="Platform" />
        <TeamInsightsPanel teamId={7} teamName="Platform" />
      </>,
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => {
      expect(screen.getAllByText("Team insights")).toHaveLength(2);
    });

    expect(getTeamInsights).toHaveBeenCalledTimes(1);
  });
});
