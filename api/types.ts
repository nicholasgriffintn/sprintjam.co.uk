import type {
	DurableObjectNamespace,
	Fetcher,
} from '@cloudflare/workers-types';

export interface Env {
  POKER_ROOM: DurableObjectNamespace;
  ASSETS: Fetcher;
  JIRA_DOMAIN?: string;
  JIRA_EMAIL?: string;
  JIRA_API_TOKEN?: string;
  JIRA_STORY_POINTS_FIELD?: string;
}

export type JudgeAlgorithm = 'smartConsensus' | 'conservativeMode' | 'optimisticMode' | 'simpleAverage';

export interface JudgeResult {
  score: number | null;
  confidence: 'high' | 'medium' | 'low';
  needsDiscussion: boolean;
  reasoning: string;
}

export type TaskSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface VoteOptionMetadata {
  value: string | number;
  background: string;
  taskSize: TaskSize | null;
}


export interface VotingCriterion {
  id: string;
  name: string;
  description: string;
  minScore: number;
  maxScore: number;
}

export interface StructuredVote {
  criteriaScores: Record<string, number>;
  calculatedStoryPoints?: string | number;
}

export interface JiraTicket {
  id: string;
  key: string;
  summary: string;
  description?: string;
  status?: string;
  storyPoints?: number;
  url?: string;
}

export interface RoomData {
  key: string;
  users: string[];
  votes: Record<string, string | number>;
  structuredVotes?: Record<string, StructuredVote>;
  showVotes: boolean;
  moderator: string;
  connectedUsers: Record<string, boolean>;
  judgeScore?: string | number | null;
  judgeMetadata?: Record<string, unknown>;
  jiraTicket?: JiraTicket;
  settings: {
    estimateOptions: (string | number)[];
    voteOptionsMetadata?: VoteOptionMetadata[];
    allowOthersToShowEstimates: boolean;
    allowOthersToDeleteEstimates: boolean;
    showTimer: boolean;
    showUserPresence: boolean;
    showAverage: boolean;
    showMedian: boolean;
    showTopVotes: boolean;
    topVotesCount: number;
    anonymousVotes: boolean;
    enableJudge: boolean;
    judgeAlgorithm: JudgeAlgorithm;
    enableStructuredVoting?: boolean;
    votingCriteria?: VotingCriterion[];
  };
}

export interface BroadcastMessage {
  type: string;
  [key: string]: unknown;
}

export interface SessionInfo {
  webSocket: WebSocket;
  roomKey: string;
  userName: string;
}