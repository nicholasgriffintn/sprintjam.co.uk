import type { Response as CfResponse } from "@cloudflare/workers-types";

import type { BroadcastMessage, RoomData } from "../../types";
import type { PlanningRoomRepository } from "../../repositories/planning-room";

export type { CfResponse };

export type PlanningRoomRepositoryShape = Pick<
  PlanningRoomRepository,
  | "getPasscodeHash"
  | "validateSessionToken"
  | "setSessionToken"
  | "ensureUser"
  | "setUserConnection"
  | "setUserAvatar"
  | "setVote"
  | "setStructuredVote"
  | "setShowVotes"
  | "clearVotes"
  | "clearStructuredVotes"
  | "setSettings"
  | "updateTimerConfig"
  | "saveJiraOAuthCredentials"
  | "getJiraOAuthCredentials"
  | "updateJiraOAuthTokens"
  | "deleteJiraOAuthCredentials"
  | "saveLinearOAuthCredentials"
  | "getLinearOAuthCredentials"
  | "updateLinearOAuthTokens"
  | "deleteLinearOAuthCredentials"
  | "saveGithubOAuthCredentials"
  | "getGithubOAuthCredentials"
  | "deleteGithubOAuthCredentials"
>;

export interface PlanningRoomHttpContext {
  repository: PlanningRoomRepositoryShape;
  getRoomData(): Promise<RoomData | undefined>;
  putRoomData(roomData: RoomData): Promise<void>;
  broadcast(message: BroadcastMessage): void;
  disconnectUserSessions?(userName: string): void;
}
