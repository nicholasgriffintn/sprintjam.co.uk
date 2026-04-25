import type { Response as CfResponse } from "@cloudflare/workers-types";
import type { BroadcastMessage, RoomData } from "@sprintjam/types";

import type { PlanningRoomRepository } from "../../repositories/planning-room";

export type { CfResponse };

export type PlanningRoomRepositoryShape = Pick<
  PlanningRoomRepository,
  | "getPasscodeHash"
  | "validateSessionToken"
  | "setSessionToken"
  | "setRecoveryPasskey"
  | "validateRecoveryPasskey"
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
>;

export interface PlanningRoomHttpContext {
  repository: PlanningRoomRepositoryShape;
  getRoomData(): Promise<RoomData | undefined>;
  putRoomData(roomData: RoomData): Promise<void>;
  broadcast(message: BroadcastMessage): void;
  disconnectUserSessions?(userName: string): void;
}
