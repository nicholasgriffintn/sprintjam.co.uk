import type { WebSocket as CfWebSocket } from "@cloudflare/workers-types";
import type { PasscodeHashPayload } from "./room";

export interface WheelEntry {
  id: string;
  name: string;
  enabled: boolean;
}

export interface SpinState {
  isSpinning: boolean;
  startedAt: number;
  targetIndex: number | null;
  duration: number;
  status: 'active' | 'completed';
}

export interface SpinResult {
  id: string;
  winner: string;
  timestamp: number;
  removedAfter: boolean;
}

export interface WheelSettings {
  removeWinnerAfterSpin: boolean;
  showConfetti: boolean;
  playSounds: boolean;
  spinDurationMs: number;
}

export type WheelStatus = "active" | "completed";

export interface WheelData {
  key: string;
  entries: WheelEntry[];
  moderator: string;
  users: string[];
  connectedUsers: Record<string, boolean>;
  spinState: SpinState | null;
  results: SpinResult[];
  settings: WheelSettings;
  status: WheelStatus;
  passcodeHash?: PasscodeHashPayload;
  userAvatars?: Record<string, string>;
}

export interface WheelSessionInfo {
  webSocket: CfWebSocket;
  wheelKey: string;
  userName: string;
}

export type WheelClientMessage =
  | { type: "addEntry"; name: string }
  | { type: "removeEntry"; entryId: string }
  | { type: "updateEntry"; entryId: string; name: string }
  | { type: "toggleEntry"; entryId: string; enabled: boolean }
  | { type: "clearEntries" }
  | { type: "bulkAddEntries"; names: string[] }
  | { type: "spin" }
  | { type: "resetWheel" }
  | { type: "updateSettings"; settings: Partial<WheelSettings> }
  | { type: "ping" };

export interface WheelBroadcastMessage {
  type: string;
  [key: string]: unknown;
}

export type WheelServerMessage =
  | { type: "initialize"; wheel: WheelData }
  | {
      type: "userJoined";
      user: string;
      users: string[];
      userAvatars?: Record<string, string>;
    }
  | { type: "userLeft"; user: string; users: string[] }
  | { type: "newModerator"; moderator: string }
  | { type: "entriesUpdated"; entries: WheelEntry[] }
  | { type: "spinStarted"; spinState: SpinState }
  | { type: "spinEnded"; result: SpinResult; entries: WheelEntry[] }
  | { type: "settingsUpdated"; settings: WheelSettings }
  | { type: "wheelReset"; entries: WheelEntry[]; results: SpinResult[] }
  | {
      type: "error";
      error: string;
      reason?: "auth" | "disconnect" | "permission";
    }
  | { type: "pong" };

export const DEFAULT_WHEEL_SETTINGS: WheelSettings = {
  removeWinnerAfterSpin: false,
  showConfetti: true,
  playSounds: true,
  spinDurationMs: 4000,
};

export const WHEEL_SPIN_DURATION_MIN = 2000;
export const WHEEL_SPIN_DURATION_MAX = 10000;
