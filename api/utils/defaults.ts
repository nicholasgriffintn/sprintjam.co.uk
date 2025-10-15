import type { RoomData, RoomSettings } from '../types';
import { JudgeAlgorithm } from '../types';
import { VOTING_OPTIONS, STRUCTURED_VOTING_OPTIONS } from '../constants';
import { generateVoteOptionsMetadata } from './votes';
import { getDefaultVotingCriteria } from './structured-voting';

export function getDefaultEstimateOptions(): (string | number)[] {
  return [...VOTING_OPTIONS];
}

export function getDefaultStructuredVotingOptions(): number[] {
  return [...STRUCTURED_VOTING_OPTIONS];
}

export function getDefaultRoomSettings(): RoomSettings {
  const estimateOptions = getDefaultEstimateOptions();

  return {
    estimateOptions,
    voteOptionsMetadata: generateVoteOptionsMetadata(estimateOptions),
    allowOthersToShowEstimates: false,
    allowOthersToDeleteEstimates: false,
    showTimer: false,
    showUserPresence: false,
    showAverage: false,
    showMedian: false,
    showTopVotes: true,
    topVotesCount: 4,
    anonymousVotes: true,
    enableJudge: true,
    judgeAlgorithm: JudgeAlgorithm.SMART_CONSENSUS,
    enableStructuredVoting: false,
    votingCriteria: getDefaultVotingCriteria(),
    enableJiraIntegration: false,
    autoUpdateJiraStoryPoints: false,
    autoHandoverModerator: false,
    resultsDisplay: {
      summaryCards: [
        { id: 'average', label: 'Average', enabled: true },
        { id: 'mode', label: 'Most Common', enabled: true },
        { id: 'topVotes', label: 'Top Votes', enabled: true },
      ],
      showVoteDistribution: true,
      voteDistributionLabel: 'Vote Distribution',
      criteriaBreakdown: {
        enabled: true,
        title: 'Criteria Breakdown',
        consensusLabels: {
          high: 'Consensus',
          medium: 'Some Split',
          low: 'Wide Split',
        },
      },
    },
    structuredVotingDisplay: {
      panelTitle: 'Structured Estimation',
      infoToggle: {
        enabled: true,
        label: 'Scoring Info',
        title: 'Weighted Scoring System',
        rangesDescription: '1pt: 0-34% | 3pt: 35-49% | 5pt: 50-79% | 8pt: 80%+',
        rangesLabel: 'Story Point Ranges:',
        showRangeDetails: true,
        showContributionDetails: true,
        showConversionRules: true,
      },
      summary: {
        storyPointsLabel: 'Story Points',
        weightedScoreLabel: 'Weighted score',
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
}

export function createInitialRoomData(options: InitialRoomOptions): RoomData {
  const {
    key = '',
    users = [],
    moderator = '',
    connectedUsers = {},
  } = options;

  const settings = getDefaultRoomSettings();

  return {
    key,
    users,
    votes: {},
    structuredVotes: {},
    showVotes: false,
    moderator,
    connectedUsers,
    judgeScore: null,
    settings,
  };
}

export function getServerDefaults() {
  const roomSettings = getDefaultRoomSettings();

  return {
    roomSettings,
    votingCriteria: roomSettings.votingCriteria,
    structuredVotingOptions: getDefaultStructuredVotingOptions(),
    deploymentConfig: {
      hasCustomVotingOptions: false,
      judgeEnabledByDefault: roomSettings.enableJudge,
      structuredVotingEnabledByDefault: roomSettings.enableStructuredVoting ?? false,
    },
  };
}
