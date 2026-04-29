/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSetName = vi.fn();
const mockSetPasscode = vi.fn();
const mockSetRoomKey = vi.fn();
const mockSetJoinFlowMode = vi.fn();
const mockSetSelectedAvatar = vi.fn();
const mockClearError = vi.fn();
const mockSetPendingCreateSettings = vi.fn();
const mockHandleCreateRoom = vi.fn();
const mockGoToWorkspaceProfile = vi.fn();
const mockNavigateTo = vi.fn();
const workspaceDataMock = {
  teams: [] as Array<{ id: number; name: string }>,
  isAuthenticated: false,
  user: null as {
    name: string;
    email: string;
    avatar: string;
  } | null,
};
const mockServerDefaults = {
  roomSettings: {
    enableStructuredVoting: false,
    votingSequenceId: "fibonacci-short",
    estimateOptions: [1, 2, 3, 5, 8],
  },
  structuredVotingOptions: [],
  votingSequences: [
    {
      id: "fibonacci-short",
      label: "Fibonacci",
      options: [1, 2, 3, 5, 8],
    },
  ],
  extraVoteOptions: [],
};

vi.mock("@/context/SessionContext", () => ({
  useSessionState: () => ({
    name: "Moderator QA",
    passcode: "",
    selectedWorkspaceTeamId: null,
  }),
  useSessionActions: () => ({
    setName: mockSetName,
    setPasscode: mockSetPasscode,
    setSelectedAvatar: mockSetSelectedAvatar,
    setRoomKey: mockSetRoomKey,
    setJoinFlowMode: mockSetJoinFlowMode,
    setSelectedWorkspaceTeamId: vi.fn(),
    goToWorkspaceProfile: mockGoToWorkspaceProfile,
  }),
  useSessionErrors: () => ({
    clearError: mockClearError,
  }),
}));

vi.mock("@/context/RoomContext", () => ({
  useRoomActions: () => ({
    setPendingCreateSettings: mockSetPendingCreateSettings,
    handleCreateRoom: mockHandleCreateRoom,
  }),
  useRoomState: () => ({
    serverDefaults: mockServerDefaults,
  }),
  useRoomStatus: () => ({
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useWorkspaceData", () => ({
  useWorkspaceData: () => workspaceDataMock,
}));

vi.mock("@/hooks/useAppNavigation", () => ({
  useAppNavigation: () => mockNavigateTo,
}));

vi.mock("@/lib/workspace-service", () => ({
  getTeamSettings: vi.fn(),
}));

import CreateRoomRoute from "@/routes/create";

describe("CreateRoomRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workspaceDataMock.teams = [];
    workspaceDataMock.isAuthenticated = false;
    workspaceDataMock.user = null;
    mockNavigateTo.mockReset();
  });

  it("does not clear a previously selected avatar when starting the create flow", () => {
    render(<CreateRoomRoute />);

    fireEvent.click(screen.getByTestId("create-room-submit"));

    expect(mockClearError).toHaveBeenCalled();
    expect(mockSetPendingCreateSettings).toHaveBeenCalled();
    expect(mockSetJoinFlowMode).toHaveBeenCalledWith("create");
    expect(mockSetRoomKey).toHaveBeenCalledWith("");
    expect(mockNavigateTo).toHaveBeenCalledWith("join");
    expect(mockSetSelectedAvatar).not.toHaveBeenCalled();
  });

  it("creates the room directly for signed-in users", async () => {
    workspaceDataMock.isAuthenticated = true;
    workspaceDataMock.user = {
      name: "Alex",
      email: "alex@example.com",
      avatar: "https://example.com/alex.png",
    };

    render(<CreateRoomRoute />);

    fireEvent.click(screen.getByTestId("create-room-submit"));

    expect(mockClearError).toHaveBeenCalled();
    expect(mockHandleCreateRoom).toHaveBeenCalled();
    expect(mockSetPendingCreateSettings).not.toHaveBeenCalled();
    expect(mockSetJoinFlowMode).not.toHaveBeenCalled();
  });
});
