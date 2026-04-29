// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createStandup } from "@/lib/standup-api-service";
import { createTeamSession } from "@/lib/workspace-service";

const mockSetScreen = vi.fn();
const mockNavigateTo = vi.fn();
const mockPersistUserName = vi.fn();

const workspaceDataMock = {
  user: null as { name: string; email: string; avatar: string } | null,
  teams: [] as Array<{
    id: number;
    name: string;
    canAccess: boolean;
    currentUserStatus?: string;
  }>,
  selectedTeamId: null as number | null,
  setSelectedTeamId: vi.fn(),
  isAuthenticated: false,
};

vi.mock("@/context/SessionContext", () => ({
  useSessionActions: () => ({ setScreen: mockSetScreen }),
}));

vi.mock("@/hooks/useWorkspaceData", () => ({
  useWorkspaceData: () => workspaceDataMock,
}));

vi.mock("@/hooks/useUserPersistence", () => ({
  useUserPersistence: vi.fn(),
  getStoredUserName: () => "",
  getStoredUserAvatar: () => null,
  persistUserName: (...args: unknown[]) => mockPersistUserName(...args),
}));

vi.mock("@/utils/avatars", () => ({
  sanitiseAvatarValue: () => null,
}));

vi.mock("@/lib/standup-api-service", () => ({
  createStandup: vi.fn(),
}));

vi.mock("@/lib/workspace-service", () => ({
  createTeamSession: vi.fn(),
}));

vi.mock("@/lib/standup-notice", () => ({
  setStandupNotice: vi.fn(),
}));

vi.mock("@/utils/storage", () => ({
  safeLocalStorage: { get: vi.fn(() => null), set: vi.fn(), remove: vi.fn() },
}));

vi.mock("@/hooks/useAppNavigation", () => ({
  useAppNavigation: () => mockNavigateTo,
}));

vi.mock("@/components/layout/PageBackground", () => ({
  PageSection: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/SurfaceCard", () => ({
  SurfaceCard: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

const mockResponse = {
  success: true,
  standup: {
    key: "ABC123",
    status: "active" as const,
    moderator: "Alice",
    users: [],
    connectedUsers: {} as Record<string, boolean>,
    respondedUsers: [] as string[],
    responses: [],
    createdAt: Date.now(),
  },
  recoveryPasskey: undefined,
};

import StandupCreateRoute from "@/routes/standup/create";

describe("StandupCreateRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workspaceDataMock.user = null;
    workspaceDataMock.teams = [];
    workspaceDataMock.selectedTeamId = null;
    workspaceDataMock.isAuthenticated = false;
  });

  it("renders the name and passcode fields", () => {
    render(<StandupCreateRoute />);

    expect(screen.getByLabelText(/your name/i)).toBeTruthy();
    expect(
      screen.getByPlaceholderText("Add a passcode for today's room"),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /create standup/i }),
    ).toBeTruthy();
  });

  it("calls createStandup and navigates to the room on success", async () => {
    vi.mocked(createStandup).mockResolvedValue(mockResponse);

    render(<StandupCreateRoute />);

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Alice" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: /create standup/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(createStandup).toHaveBeenCalledWith(
        "Alice",
        undefined,
        undefined,
        undefined,
      );
    });

    expect(mockSetScreen).toHaveBeenCalledWith("standupRoom");
    expect(mockPersistUserName).toHaveBeenCalledWith("Alice");
    expect(mockNavigateTo).toHaveBeenCalledWith("standupRoom", {
      standupKey: "ABC123",
    });
  });

  it("passes the passcode when provided", async () => {
    vi.mocked(createStandup).mockResolvedValue(mockResponse);

    render(<StandupCreateRoute />);

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Alice" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Add a passcode for today's room"),
      {
        target: { value: "secret" },
      },
    );
    fireEvent.submit(
      screen.getByRole("button", { name: /create standup/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(createStandup).toHaveBeenCalledWith(
        "Alice",
        "secret",
        undefined,
        undefined,
      );
    });
  });

  it("shows an error alert when createStandup rejects", async () => {
    vi.mocked(createStandup).mockRejectedValue(new Error("Rate limit reached"));

    render(<StandupCreateRoute />);

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Alice" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: /create standup/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(screen.getByText("Rate limit reached")).toBeTruthy();
    });
  });

  it("shows the workspace team selector when authenticated with teams", () => {
    workspaceDataMock.isAuthenticated = true;
    workspaceDataMock.teams = [{ id: 1, name: "Acme", canAccess: true }];

    render(<StandupCreateRoute />);

    expect(screen.getByLabelText(/workspace team/i)).toBeTruthy();
    expect(screen.getByText("Acme")).toBeTruthy();
  });

  it("passes the teamId when a team is selected", async () => {
    vi.mocked(createStandup).mockResolvedValue(mockResponse);
    vi.mocked(createTeamSession).mockResolvedValue(undefined as never);

    workspaceDataMock.isAuthenticated = true;
    workspaceDataMock.selectedTeamId = 1;
    workspaceDataMock.teams = [{ id: 1, name: "Acme", canAccess: true }];

    render(<StandupCreateRoute />);

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Alice" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: /create standup/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(createStandup).toHaveBeenCalledWith(
        "Alice",
        undefined,
        undefined,
        1,
      );
    });
  });
});
