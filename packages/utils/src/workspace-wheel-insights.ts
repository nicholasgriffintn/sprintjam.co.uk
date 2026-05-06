import type {
  RecordWheelSessionStatsInput,
  WorkspaceWheelInsights,
  WorkspaceWheelMode,
  WorkspaceWheelSessionInsights,
} from "@sprintjam/types";

function createEmptyWheelModeCounts(): Record<WorkspaceWheelMode, number> {
  return {
    decision: 0,
    reviewer: 0,
    facilitator: 0,
  };
}

export function createEmptyWorkspaceWheelSessionInsights(
  mode: WorkspaceWheelMode = "facilitator",
): WorkspaceWheelSessionInsights {
  return {
    mode,
    totalParticipants: 0,
    entryCount: 0,
    enabledEntryCount: 0,
    spinCount: 0,
    uniqueWinnerCount: 0,
    removedAfterCount: 0,
    repeatWinnerCount: 0,
  };
}

export function createEmptyWorkspaceWheelInsights(): WorkspaceWheelInsights {
  return {
    ...createEmptyWorkspaceWheelSessionInsights(),
    sessionsAnalyzed: 0,
    averageSpinsPerSession: 0,
    uniqueWinnerRate: 0,
    repeatWinnerRate: 0,
    removalRate: 0,
    modeSessionCounts: createEmptyWheelModeCounts(),
    modeSpinCounts: createEmptyWheelModeCounts(),
  };
}

export function buildWorkspaceWheelSessionInsights(
  input: Omit<RecordWheelSessionStatsInput, "roomKey">,
): WorkspaceWheelSessionInsights {
  const winnerCounts = new Map<string, number>();
  const insights = createEmptyWorkspaceWheelSessionInsights(input.mode);

  insights.totalParticipants = input.totalParticipants;
  insights.entryCount = input.entryCount;
  insights.enabledEntryCount = input.enabledEntryCount;
  insights.spinCount = input.results.length;

  for (const result of input.results) {
    winnerCounts.set(result.winner, (winnerCounts.get(result.winner) ?? 0) + 1);
    if (result.removedAfter) {
      insights.removedAfterCount++;
    }
  }

  insights.uniqueWinnerCount = winnerCounts.size;
  for (const count of winnerCounts.values()) {
    if (count > 1) {
      insights.repeatWinnerCount += count - 1;
    }
  }

  return insights;
}

export function aggregateWorkspaceWheelInsights(
  sessionInsights: WorkspaceWheelSessionInsights[],
): WorkspaceWheelInsights {
  const aggregate = createEmptyWorkspaceWheelInsights();
  aggregate.sessionsAnalyzed = sessionInsights.length;

  for (const insights of sessionInsights) {
    aggregate.totalParticipants += insights.totalParticipants;
    aggregate.entryCount += insights.entryCount;
    aggregate.enabledEntryCount += insights.enabledEntryCount;
    aggregate.spinCount += insights.spinCount;
    aggregate.uniqueWinnerCount += insights.uniqueWinnerCount;
    aggregate.removedAfterCount += insights.removedAfterCount;
    aggregate.repeatWinnerCount += insights.repeatWinnerCount;
    aggregate.modeSessionCounts[insights.mode]++;
    aggregate.modeSpinCounts[insights.mode] += insights.spinCount;
  }

  aggregate.averageSpinsPerSession =
    aggregate.sessionsAnalyzed > 0
      ? aggregate.spinCount / aggregate.sessionsAnalyzed
      : 0;
  aggregate.uniqueWinnerRate =
    aggregate.spinCount > 0
      ? (aggregate.uniqueWinnerCount / aggregate.spinCount) * 100
      : 0;
  aggregate.repeatWinnerRate =
    aggregate.spinCount > 0
      ? (aggregate.repeatWinnerCount / aggregate.spinCount) * 100
      : 0;
  aggregate.removalRate =
    aggregate.spinCount > 0
      ? (aggregate.removedAfterCount / aggregate.spinCount) * 100
      : 0;

  return aggregate;
}
