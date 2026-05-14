import type {
  RecordRetroSessionStatsInput,
  WorkspaceRetroInsights,
} from "@sprintjam/types";

export function createEmptyWorkspaceRetroInsights(): WorkspaceRetroInsights {
  return {
    sessions: 0,
    totalParticipants: 0,
    totalCards: 0,
    totalVotes: 0,
    totalActions: 0,
    completedActions: 0,
    averageCardsPerSession: 0,
    averageVotesPerSession: 0,
  };
}

export function buildWorkspaceRetroSessionInsights(
  session: RecordRetroSessionStatsInput,
): WorkspaceRetroInsights {
  return {
    sessions: 1,
    totalParticipants: session.totalParticipants,
    totalCards: session.cardCount,
    totalVotes: session.voteCount,
    totalActions: session.actionCount,
    completedActions: session.completedActionCount,
    averageCardsPerSession: session.cardCount,
    averageVotesPerSession: session.voteCount,
  };
}

export function aggregateWorkspaceRetroInsights(
  sessions: WorkspaceRetroInsights[],
): WorkspaceRetroInsights {
  const aggregate = createEmptyWorkspaceRetroInsights();

  for (const session of sessions) {
    aggregate.sessions += session.sessions;
    aggregate.totalParticipants += session.totalParticipants;
    aggregate.totalCards += session.totalCards;
    aggregate.totalVotes += session.totalVotes;
    aggregate.totalActions += session.totalActions;
    aggregate.completedActions += session.completedActions;
  }

  if (aggregate.sessions > 0) {
    aggregate.averageCardsPerSession =
      aggregate.totalCards / aggregate.sessions;
    aggregate.averageVotesPerSession =
      aggregate.totalVotes / aggregate.sessions;
  }

  return aggregate;
}
