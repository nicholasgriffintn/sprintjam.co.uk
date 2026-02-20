import type { RoomGameSession } from "@sprintjam/types";

export interface GameEngineMoveContext {
  session: RoomGameSession;
  userName: string;
  value: string;
  move: RoomGameSession["moves"][number];
}

export interface GameEngine {
  title: string;
  initializeSessionState: () => Partial<RoomGameSession>;
  isMoveValueValid?: (value: string) => boolean;
  applyMove: (context: GameEngineMoveContext) => void;
}
