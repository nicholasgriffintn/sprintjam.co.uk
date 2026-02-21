import type {
  ErrorConnectionIssue,
  ErrorKind,
  RoomData,
  RoomSettings,
  ServerDefaults,
  TicketQueueItem,
} from "@/types";
import type { RoomGameType, StructuredVote, VoteValue } from "@sprintjam/types";

export interface RoomStateContextValue {
  serverDefaults: ServerDefaults | null;
  roomData: RoomData | null;
  activeRoomKey: string | null;
  isModeratorView: boolean;
  userVote: VoteValue | StructuredVote | null;
  pendingCreateSettings: Partial<RoomSettings> | null;
}

export interface RoomStatusContextValue {
  isLoadingDefaults: boolean;
  defaultsError: string | null;
  isLoading: boolean;
  isSocketConnected: boolean;
  isSocketStatusKnown: boolean;
  connectionIssue: ErrorConnectionIssue | null;
  roomError: string;
  roomErrorKind: ErrorKind | null;
}

export interface RoomActionsContextValue {
  handleRetryDefaults: () => void;
  clearRoomError: () => void;
  reportRoomError: (message: string, kind?: ErrorKind | null) => void;
  setPendingCreateSettings: (settings: Partial<RoomSettings> | null) => void;
  handleCreateRoom: (settings?: Partial<RoomSettings>) => Promise<void>;
  handleJoinRoom: () => Promise<void>;
  handleLeaveRoom: () => void;
  handleVote: (value: VoteValue | StructuredVote) => void;
  handleToggleShowVotes: () => void;
  handleToggleSpectatorMode: (isSpectator: boolean) => void;
  handleResetVotes: () => void;
  handleUpdateSettings: (settings: RoomSettings) => void;
  handleSelectTicket: (ticketId: number) => void;
  handleNextTicket: () => void;
  handleAddTicket: (ticket: Partial<TicketQueueItem>) => Promise<void>;
  handleUpdateTicket: (
    ticketId: number,
    updates: Partial<TicketQueueItem>,
  ) => Promise<void>;
  handleDeleteTicket: (ticketId: number) => Promise<void>;
  handleCompleteSession: () => void;
  handleStartGame: (gameType: RoomGameType) => void;
  handleSubmitGameMove: (value: string) => void;
  handleEndGame: () => void;
  retryConnection: () => void;
}
