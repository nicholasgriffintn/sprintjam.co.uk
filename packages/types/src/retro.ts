import type { WebSocket as CfWebSocket } from "@cloudflare/workers-types";
import type { PasscodeHashPayload, TimerState } from "./room";
import type { WorkspaceActionPriority } from "./workspace";

export type RetroPhase = "input" | "review" | "focus" | "completed";

export interface RetroTemplateColumn {
  id: string;
  title: string;
  prompt: string;
  tone: "emerald" | "rose" | "sky" | "amber" | "violet" | "slate";
}

export interface RetroTemplate {
  id: string;
  name: string;
  summary: string;
  description: string;
  columns: RetroTemplateColumn[];
  tags: string[];
}

export interface RetroSettings {
  templateId: string;
  anonymousCards: boolean;
  hideCardsDuringInput: boolean;
  votesPerParticipant: number;
  timerMinutes: number;
  allowParticipantPhaseControl: boolean;
}

export interface RetroCard {
  id: string;
  columnId: string;
  text: string;
  groupId?: string;
  groupTitle?: string;
  owner?: string;
  author: string;
  createdAt: number;
  votes: string[];
}

export interface RetroActionItem {
  id: string;
  title: string;
  owner?: string;
  dueAt?: number | null;
  priority?: WorkspaceActionPriority;
  createdAt: number;
  completed: boolean;
}

export type RetroStatus = "active" | "completed";

export interface RetroData {
  key: string;
  template: RetroTemplate;
  settings: RetroSettings;
  moderator: string;
  users: string[];
  connectedUsers: Record<string, boolean>;
  phase: RetroPhase;
  phaseStartedAt: number;
  timerState?: TimerState;
  status: RetroStatus;
  cards: RetroCard[];
  actionItems: RetroActionItem[];
  readyUsers: string[];
  userAvatars?: Record<string, string>;
  createdAt: number;
  completedAt?: number;
}

export interface RetroStateData extends RetroData {
  passcodeHash?: PasscodeHashPayload;
  sessionTokens?: Record<string, { token: string; createdAt: number }>;
  workspaceUserIds?: Record<string, number>;
}

export interface RetroAccessSettings {
  settings: RetroSettings;
  moderator: string;
  template: RetroTemplate;
  isModerator: boolean;
  hasPasscode: boolean;
}

export interface RetroSessionInfo {
  webSocket: CfWebSocket;
  retroKey: string;
  userName: string;
}

export type RetroClientMessage =
  | { type: "addCard"; columnId: string; text: string }
  | { type: "updateCard"; cardId: string; text: string }
  | { type: "moveCard"; cardId: string; columnId: string }
  | { type: "groupCards"; cardIds: string[]; title: string }
  | { type: "ungroupCard"; cardId: string }
  | { type: "deleteCard"; cardId: string }
  | { type: "voteCard"; cardId: string }
  | { type: "setPhase"; phase: RetroPhase }
  | { type: "setReady"; ready: boolean }
  | {
      type: "addAction";
      title: string;
      owner?: string;
      dueAt?: number | null;
      priority?: WorkspaceActionPriority;
    }
  | {
      type: "updateAction";
      actionId: string;
      title?: string;
      owner?: string | null;
      dueAt?: number | null;
      priority?: WorkspaceActionPriority;
    }
  | { type: "toggleAction"; actionId: string; completed: boolean }
  | { type: "startTimer" }
  | { type: "pauseTimer" }
  | { type: "resetTimer" }
  | {
      type: "configureTimer";
      config: { targetDurationSeconds?: number; resetCountdown?: boolean };
    }
  | { type: "extendTimer"; seconds: number }
  | { type: "updateSettings"; settings: Partial<RetroSettings> }
  | { type: "completeRetro" }
  | { type: "ping" };

export type RetroServerMessage =
  | { type: "initialize"; retro: RetroData }
  | {
      type: "userJoined";
      user: string;
      users: string[];
      userAvatars?: Record<string, string>;
    }
  | { type: "userLeft"; user: string; users: string[] }
  | { type: "retroUpdated"; retro: RetroData }
  | {
      type: "error";
      error: string;
      reason?: "auth" | "disconnect" | "permission";
    }
  | { type: "pong" };

export interface RecordRetroSessionStatsInput {
  roomKey: string;
  templateId: string;
  templateName: string;
  totalParticipants: number;
  cardCount: number;
  voteCount: number;
  actionCount: number;
  completedActionCount: number;
  durationMs?: number;
}

export interface WorkspaceRetroInsights {
  sessions: number;
  totalParticipants: number;
  totalCards: number;
  totalVotes: number;
  totalActions: number;
  completedActions: number;
  averageCardsPerSession: number;
  averageVotesPerSession: number;
}

export const DEFAULT_RETRO_SETTINGS: RetroSettings = {
  templateId: "start-stop-continue",
  anonymousCards: false,
  hideCardsDuringInput: true,
  votesPerParticipant: 3,
  timerMinutes: 10,
  allowParticipantPhaseControl: false,
};
