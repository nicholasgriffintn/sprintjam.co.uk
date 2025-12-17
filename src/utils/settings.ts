import type {
  RoomData,
  VoteValue,
  RoomSettings,
  ServerDefaults,
} from "../types";

const cloneRoomSettings = (settings: RoomSettings): RoomSettings => ({
  ...settings,
  estimateOptions: [...settings.estimateOptions],
  voteOptionsMetadata: settings.voteOptionsMetadata
    ? settings.voteOptionsMetadata.map((metadata) => ({ ...metadata }))
    : undefined,
  votingCriteria: settings.votingCriteria
    ? settings.votingCriteria.map((criterion) => ({ ...criterion }))
    : undefined,
  autoHandoverModerator: settings.autoHandoverModerator ?? false,
  resultsDisplay: settings.resultsDisplay
    ? {
        ...settings.resultsDisplay,
        summaryCards: settings.resultsDisplay.summaryCards
          ? settings.resultsDisplay.summaryCards.map((card) => ({ ...card }))
          : undefined,
        criteriaBreakdown: settings.resultsDisplay.criteriaBreakdown
          ? {
              ...settings.resultsDisplay.criteriaBreakdown,
              consensusLabels: settings.resultsDisplay.criteriaBreakdown
                .consensusLabels
                ? {
                    ...settings.resultsDisplay.criteriaBreakdown
                      .consensusLabels,
                  }
                : undefined,
            }
          : undefined,
      }
    : undefined,
  structuredVotingDisplay: settings.structuredVotingDisplay
    ? {
        ...settings.structuredVotingDisplay,
        infoToggle: settings.structuredVotingDisplay.infoToggle
          ? { ...settings.structuredVotingDisplay.infoToggle }
          : undefined,
        summary: settings.structuredVotingDisplay.summary
          ? { ...settings.structuredVotingDisplay.summary }
          : undefined,
      }
    : undefined,
});

export const cloneServerDefaults = (
  defaults: ServerDefaults,
): ServerDefaults => ({
  roomSettings: cloneRoomSettings(defaults.roomSettings),
  votingCriteria: defaults.votingCriteria.map((criterion) => ({
    ...criterion,
  })),
  structuredVotingOptions: [...defaults.structuredVotingOptions],
});

export const buildInitialRoomData = (settings: RoomSettings): RoomData => ({
  key: "",
  users: [],
  votes: {} as Record<string, VoteValue | null>,
  structuredVotes: {},
  showVotes: false,
  moderator: "",
  connectedUsers: {},
  judgeScore: null,
  settings: cloneRoomSettings(settings),
});
