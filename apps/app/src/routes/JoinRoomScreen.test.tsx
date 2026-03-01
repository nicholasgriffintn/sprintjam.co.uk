/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
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
  user: null as
    | {
        name: string;
        email: string;
        avatar: string;
      }
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
    error: "",
    errorKind: null,
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

vi.mock("@/components/AvatarSelector", () => ({
  default: () => <div data-testid="avatar-selector" />,
}));

vi.mock("@/components/layout/PageBackground", () => ({
  PageSection: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/SurfaceCard", () => ({
  SurfaceCard: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/Button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type = "button",
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type={type} onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/Input", () => ({
  Input: ({ id, label, value, onChange, ...props }: any) => (
    <label htmlFor={id}>
      {typeof label === "string" ? label : "input"}
      <input id={id} value={value} onChange={onChange} {...props} />
    </label>
  ),
}));

vi.mock("@/components/ui/Alert", () => ({
  Alert: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/Avatar", () => ({
  Avatar: ({ fallback }: { fallback?: ReactNode }) => <div>{fallback}</div>,
}));

vi.mock("@/components/layout/Footer", () => ({
  Footer: () => null,
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

    expect(screen.queryByTestId("avatar-selector")).toBeNull();
    expect(screen.queryByPlaceholderText("Team member name")).toBeNull();

    fireEvent.click(screen.getByTestId("join-room-submit"));

    expect(mockClearError).toHaveBeenCalled();
    expect(mockHandleJoinRoom).toHaveBeenCalled();
    expect(mockSetJoinFlowMode).not.toHaveBeenCalledWith("join");
  });
});
