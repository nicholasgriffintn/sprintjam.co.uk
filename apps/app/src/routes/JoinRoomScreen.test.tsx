/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionStateMock = {
  name: "Anon",
  roomKey: "ABC123",
  passcode: "",
  selectedAvatar: "user",
  joinFlowMode: "join" as "join" | "create",
};

const workspaceDataMock = {
  isAuthenticated: false,
  user: null as {
    name: string;
    email: string;
    avatar: string;
  } | null,
};
const sessionErrorMock = {
  error: "",
  errorKind: null as
    | "permission"
    | "auth"
    | "passcode"
    | "network"
    | "validation"
    | "conflict"
    | "unknown"
    | null,
};

const mockSetName = vi.fn();
const mockSetRoomKey = vi.fn();
const mockSetPasscode = vi.fn();
const mockSetSelectedAvatar = vi.fn();
const mockSetScreen = vi.fn();
const mockSetJoinFlowMode = vi.fn();
const mockGoHome = vi.fn();
const mockGoToWorkspaceProfile = vi.fn();
const mockHandleJoinRoom = vi.fn();
const mockHandleCreateRoom = vi.fn();
const mockClearError = vi.fn();

vi.mock("@/context/SessionContext", () => ({
  useSessionState: () => sessionStateMock,
  useSessionActions: () => ({
    setName: mockSetName,
    setRoomKey: mockSetRoomKey,
    setPasscode: mockSetPasscode,
    setSelectedAvatar: mockSetSelectedAvatar,
    setScreen: mockSetScreen,
    setJoinFlowMode: mockSetJoinFlowMode,
    goHome: mockGoHome,
    goToWorkspaceProfile: mockGoToWorkspaceProfile,
  }),
  useSessionErrors: () => ({
    error: sessionErrorMock.error,
    errorKind: sessionErrorMock.errorKind,
    clearError: mockClearError,
  }),
}));

vi.mock("@/context/RoomContext", () => ({
  useRoomActions: () => ({
    handleJoinRoom: mockHandleJoinRoom,
    handleCreateRoom: mockHandleCreateRoom,
  }),
  useRoomStatus: () => ({
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useWorkspaceData", () => ({
  useWorkspaceData: () => workspaceDataMock,
}));

vi.mock("@/hooks/usePageMeta", () => ({
  usePageMeta: vi.fn(),
}));

import JoinRoomScreen from "@/routes/JoinRoomScreen";

describe("JoinRoomScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStateMock.name = "Anon";
    sessionStateMock.roomKey = "ABC123";
    sessionStateMock.passcode = "";
    sessionStateMock.selectedAvatar = "user";
    sessionStateMock.joinFlowMode = "join";
    sessionErrorMock.error = "";
    sessionErrorMock.errorKind = null;
    workspaceDataMock.isAuthenticated = false;
    workspaceDataMock.user = null;
  });

  it("joins directly with workspace profile details for signed-in users", () => {
    workspaceDataMock.isAuthenticated = true;
    workspaceDataMock.user = {
      name: "Alex",
      email: "alex@example.com",
      avatar: "https://example.com/alex.png",
    };

    render(<JoinRoomScreen />);

    expect(screen.queryByPlaceholderText("Team member name")).toBeNull();
    expect(
      screen.queryByRole("button", { name: /use custom emoji/i }),
    ).toBeNull();

    fireEvent.click(screen.getByTestId("join-room-submit"));

    expect(mockClearError).toHaveBeenCalled();
    expect(mockHandleJoinRoom).toHaveBeenCalled();
    expect(mockSetJoinFlowMode).not.toHaveBeenCalledWith("join");
  });

  it("shows the rejoin guidance for expired sessions", () => {
    sessionErrorMock.error = "Session expired. Please rejoin the room.";
    sessionErrorMock.errorKind = "auth";

    render(<JoinRoomScreen />);

    expect(screen.getByRole("alert").textContent).toContain(
      "Session expired. Rejoin with a fresh link.",
    );
  });
});
