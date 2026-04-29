/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSetName = vi.fn();
const mockSetPasscode = vi.fn();
const mockSetRoomKey = vi.fn();
const mockSetScreen = vi.fn();
const mockSetJoinFlowMode = vi.fn();
const mockSetSelectedAvatar = vi.fn();
const mockClearError = vi.fn();
const mockSetPendingCreateSettings = vi.fn();
const mockHandleCreateRoom = vi.fn();
const mockGoToWorkspaceProfile = vi.fn();
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
    setScreen: mockSetScreen,
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

vi.mock("@/lib/workspace-service", () => ({
  getTeamSettings: vi.fn(),
}));

vi.mock("@/components/layout/PageBackground", () => ({
  PageSection: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/SurfaceCard", () => ({
  SurfaceCard: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/Button", () => ({
  Button: ({ children, onClick, disabled, type = "button", ...props }: any) => (
    <button type={type} onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/Switch", () => ({
  Switch: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/Input", () => ({
  Input: ({
    id,
    value,
    onChange,
    label,
    fullWidth: _fullWidth,
    showValidation: _showValidation,
    isValid: _isValid,
    ...props
  }: any) => (
    <label htmlFor={id}>
      {typeof label === "string" ? label : "input"}
      <input id={id} value={value} onChange={onChange} {...props} />
    </label>
  ),
}));

vi.mock("@/components/ui/Select", () => ({
  Select: ({ id, value, onValueChange, options, ...props }: any) => (
    <select
      id={id}
      value={value}
      onChange={(event) => onValueChange?.(event.target.value)}
      {...props}
    >
      {options.map((option: { label: string; value: string }) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock("@/components/layout/Footer", () => ({
  Footer: () => null,
}));

vi.mock("@/components/RoomSettingsTabs", () => ({
  RoomSettingsTabs: () => null,
}));

import CreateRoomRoute from "@/routes/create";

describe("CreateRoomRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workspaceDataMock.teams = [];
    workspaceDataMock.isAuthenticated = false;
    workspaceDataMock.user = null;
  });

  it("does not clear a previously selected avatar when starting the create flow", () => {
    render(<CreateRoomRoute />);

    fireEvent.click(screen.getByTestId("create-room-submit"));

    expect(mockClearError).toHaveBeenCalled();
    expect(mockSetPendingCreateSettings).toHaveBeenCalled();
    expect(mockSetJoinFlowMode).toHaveBeenCalledWith("create");
    expect(mockSetRoomKey).toHaveBeenCalledWith("");
    expect(mockSetScreen).toHaveBeenCalledWith("join");
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
    expect(mockSetScreen).not.toHaveBeenCalled();
  });
});
