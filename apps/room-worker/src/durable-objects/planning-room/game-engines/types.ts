import type { RoomData, RoomGameSession } from "@sprintjam/types";

export interface GameEngineMoveContext {
  session: RoomGameSession;
  userName: string;
  value: string;
  move: RoomGameSession["moves"][number];
}

export interface GameEngine {
  title: string;
  maxRounds?: number;
  allowConsecutiveMoves?: boolean;
  canStart?: (roomData: RoomData) => string | undefined;
  initializeSessionState: (roomData: RoomData) => Partial<RoomGameSession>;
  isMoveValueValid?: (value: string) => boolean;
  applyMove: (context: GameEngineMoveContext) => void;
}
