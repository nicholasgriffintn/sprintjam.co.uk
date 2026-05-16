import type {
  RecordStandupSessionStatsInput,
  StandupData,
  WorkspaceStandupInsights,
  WorkspaceStandupSessionInsights,
} from "@sprintjam/types";

export function createEmptyWorkspaceStandupSessionInsights(): WorkspaceStandupSessionInsights {
  return {
    totalParticipants: 0,
    responsesSubmitted: 0,
    healthScoreTotal: 0,
    healthResponseCount: 0,
    blockerCount: 0,
    unresolvedBlockerCount: 0,
    linkedTicketCount: 0,
    kudosCount: 0,
  };
}

export function createEmptyWorkspaceStandupInsights(): WorkspaceStandupInsights {
  return {
    ...createEmptyWorkspaceStandupSessionInsights(),
    sessionsAnalyzed: 0,
    responseRate: 0,
    averageHealth: null,
    blockerRate: 0,
    unresolvedBlockerRate: 0,
  };
}

export function buildWorkspaceStandupSessionInsights(
  standupData: StandupData,
): WorkspaceStandupSessionInsights {
  return buildWorkspaceStandupSessionInsightsFromResponses({
    totalParticipants: standupData.users.length,
    responses: standupData.responses.map((response) => ({
      healthCheck: response.healthCheck,
      hasBlocker: response.hasBlocker,
      blockerResolved: response.blockerResolved,
      linkedTicketCount: response.linkedTickets?.length ?? 0,
      hasKudos: Boolean(response.kudos?.trim()),
    })),
  });
}

export function buildWorkspaceStandupSessionInsightsFromResponses(
  input: Pick<
    RecordStandupSessionStatsInput,
    "totalParticipants" | "responses"
  >,
): WorkspaceStandupSessionInsights {
  const insights = createEmptyWorkspaceStandupSessionInsights();

  insights.totalParticipants = input.totalParticipants;
  insights.responsesSubmitted = input.responses.length;

  for (const response of input.responses) {
    insights.healthScoreTotal += response.healthCheck;
    insights.healthResponseCount++;

    if (response.hasBlocker) {
      insights.blockerCount++;
      if (!response.blockerResolved) {
        insights.unresolvedBlockerCount++;
      }
    }

    insights.linkedTicketCount += response.linkedTicketCount ?? 0;
    if (response.hasKudos) {
      insights.kudosCount++;
    }
  }

  return insights;
}

export function aggregateWorkspaceStandupInsights(
  sessionInsights: WorkspaceStandupSessionInsights[],
): WorkspaceStandupInsights {
  const aggregate = createEmptyWorkspaceStandupInsights();
  aggregate.sessionsAnalyzed = sessionInsights.length;

  for (const insights of sessionInsights) {
    aggregate.totalParticipants += insights.totalParticipants;
    aggregate.responsesSubmitted += insights.responsesSubmitted;
    aggregate.healthScoreTotal += insights.healthScoreTotal;
    aggregate.healthResponseCount += insights.healthResponseCount;
    aggregate.blockerCount += insights.blockerCount;
    aggregate.unresolvedBlockerCount += insights.unresolvedBlockerCount;
    aggregate.linkedTicketCount += insights.linkedTicketCount;
    aggregate.kudosCount += insights.kudosCount;
  }

  aggregate.responseRate =
    aggregate.totalParticipants > 0
      ? (aggregate.responsesSubmitted / aggregate.totalParticipants) * 100
      : 0;
  aggregate.averageHealth =
    aggregate.healthResponseCount > 0
      ? aggregate.healthScoreTotal / aggregate.healthResponseCount
      : null;
  aggregate.blockerRate =
    aggregate.responsesSubmitted > 0
      ? (aggregate.blockerCount / aggregate.responsesSubmitted) * 100
      : 0;
  aggregate.unresolvedBlockerRate =
    aggregate.blockerCount > 0
      ? (aggregate.unresolvedBlockerCount / aggregate.blockerCount) * 100
      : 0;

  return aggregate;
}
