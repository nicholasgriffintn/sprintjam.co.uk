import type { PasscodeHashPayload, RoomData, RoomSettings } from "../types";
import { JudgeAlgorithm } from "../types";
import { VOTING_OPTIONS, STRUCTURED_VOTING_OPTIONS } from "../constants";
import { generateVoteOptionsMetadata } from "./votes";
import { getDefaultVotingCriteria } from "./structured-voting";

export function getDefaultEstimateOptions(): (string | number)[] {
  return [...VOTING_OPTIONS];
}

export function getDefaultStructuredVotingOptions(): number[] {
  return [...STRUCTURED_VOTING_OPTIONS];
}

export function getDefaultRoomSettings(
  settings?: Partial<RoomSettings>,
): RoomSettings {
  let estimateOptions = settings?.estimateOptions;
  if (!estimateOptions || !Array.isArray(estimateOptions)) {
    estimateOptions = getDefaultEstimateOptions();
  }

  let voteOptionsMetadata = settings?.voteOptionsMetadata;
  if (!voteOptionsMetadata || typeof voteOptionsMetadata !== "object") {
    voteOptionsMetadata = generateVoteOptionsMetadata(estimateOptions);
  }

  let votingCriteria = settings?.votingCriteria;
  if (!votingCriteria || !Array.isArray(votingCriteria)) {
    votingCriteria = getDefaultVotingCriteria();
  }

  return {
    estimateOptions,
    voteOptionsMetadata,
    allowOthersToShowEstimates: settings?.allowOthersToShowEstimates ?? false,
    allowOthersToDeleteEstimates:
      settings?.allowOthersToDeleteEstimates ?? false,
    allowVotingAfterReveal: settings?.allowVotingAfterReveal ?? false,
    showTimer: settings?.showTimer ?? true,
    showUserPresence: settings?.showUserPresence ?? false,
    showAverage: settings?.showAverage ?? true,
    showMedian: settings?.showMedian ?? true,
    showTopVotes: settings?.showTopVotes ?? true,
    topVotesCount: settings?.topVotesCount ?? 4,
    anonymousVotes: settings?.anonymousVotes ?? true,
    enableJudge: settings?.enableJudge ?? true,
    judgeAlgorithm: settings?.judgeAlgorithm ?? JudgeAlgorithm.SMART_CONSENSUS,
    hideParticipantNames: settings?.hideParticipantNames ?? false,
    externalService: settings?.externalService ?? "none",
    enableStructuredVoting: settings?.enableStructuredVoting ?? false,
    votingCriteria,
    autoSyncEstimates: settings?.autoSyncEstimates ?? true,
    autoHandoverModerator: settings?.autoHandoverModerator ?? false,
    enableStrudelPlayer: settings?.enableStrudelPlayer ?? true,
    strudelAutoGenerate: settings?.strudelAutoGenerate ?? false,
    enableTicketQueue: settings?.enableTicketQueue ?? false,
    resultsDisplay: {
      showVoteDistribution: true,
      voteDistributionLabel: "Vote Distribution",
      criteriaBreakdown: {
        enabled: true,
        title: "Criteria Breakdown",
        consensusLabels: {
          high: "Consensus",
          medium: "Some Split",
          low: "Wide Split",
        },
      },
    },
    structuredVotingDisplay: {
      panelTitle: "Structured Estimation",
      infoToggle: {
        enabled: true,
        label: "Scoring Info",
        title: "Weighted Scoring System",
        rangesDescription: "1pt: 0-34% | 3pt: 35-49% | 5pt: 50-79% | 8pt: 80%+",
        rangesLabel: "Story Point Ranges:",
        showRangeDetails: true,
        showContributionDetails: true,
        showConversionRules: true,
      },
      summary: {
        storyPointsLabel: "Story Points",
        weightedScoreLabel: "Weighted score",
        showConversionCount: true,
      },
    },
  };
}

interface InitialRoomOptions {
  key?: string;
  users?: string[];
  moderator?: string;
  connectedUsers?: Record<string, boolean>;
  passcodeHash?: PasscodeHashPayload;
  settings?: Partial<RoomSettings>;
}

export function createInitialRoomData(options: InitialRoomOptions): RoomData {
  const {
    key = "",
    users = [],
    moderator = "",
    connectedUsers = {},
    passcodeHash,
    settings,
  } = options;

  const settingsWithDefaults = getDefaultRoomSettings(settings);

  return {
    key,
    users,
    votes: {},
    structuredVotes: {},
    showVotes: false,
    moderator,
    connectedUsers,
    judgeScore: null,
    settings: settingsWithDefaults,
    passcodeHash,
  };
}

export function getServerDefaults() {
  const roomSettings = getDefaultRoomSettings();

  return {
    roomSettings,
    votingCriteria: roomSettings.votingCriteria,
    structuredVotingOptions: getDefaultStructuredVotingOptions(),
  };
}
