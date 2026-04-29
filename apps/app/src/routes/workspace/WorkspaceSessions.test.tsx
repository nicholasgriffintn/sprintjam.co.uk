/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TeamSession, WorkspaceTeam } from "@sprintjam/types";

const refreshWorkspace = vi.fn();
const goToLogin = vi.fn();
const goToRoom = vi.fn();
const startCreateFlow = vi.fn();
const setScreen = vi.fn();
const requestTeamAccess = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
const navigateTo = vi.fn();

const restrictedTeam: WorkspaceTeam = {
  id: 10,
  name: "Platform",
  organisationId: 1,
  ownerId: 2,
  accessPolicy: "restricted",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  currentUserRole: null,
  currentUserStatus: null,
  canAccess: false,
  canManage: false,
};

const accessibleTeam: WorkspaceTeam = {
  ...restrictedTeam,
  canAccess: true,
  currentUserRole: "member",
  currentUserStatus: "active",
};

const workspaceDataMock: {
  user: {
    id: number;
    email: string;
    name: string;
    organisationId: number;
    avatar: string | null;
  };
  teams: WorkspaceTeam[];
  sessions: TeamSession[];
  selectedTeamId: number | null;
  setSelectedTeamId: ReturnType<typeof vi.fn>;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoadingSessions: boolean;
  error: string | null;
  refreshWorkspace: typeof refreshWorkspace;
} = {
  user: {
    id: 1,
    email: "member@example.com",
    name: "Member User",
    organisationId: 1,
    avatar: null,
  },
  teams: [restrictedTeam],
  sessions: [],
  selectedTeamId: 10,
  setSelectedTeamId: vi.fn(),
  isAuthenticated: true,
  isLoading: false,
  isLoadingSessions: false,
  error: null as string | null,
  refreshWorkspace,
};

const planningSession: TeamSession = {
  id: 1,
  teamId: 10,
  roomKey: "ROOM42",
  name: "Sprint 12 Planning",
  createdById: 1,
  createdAt: Date.now(),
  completedAt: null,
  metadata: null,
};

const standupSession: TeamSession = {
  id: 2,
  teamId: 10,
  roomKey: "STAND9",
  name: "Daily Standup",
  createdById: 1,
  createdAt: Date.now(),
  completedAt: null,
  metadata: JSON.stringify({ type: "standup" }),
};

vi.mock("@/hooks/usePageMeta", () => ({
  usePageMeta: vi.fn(),
}));

vi.mock("@/hooks/useWorkspaceData", () => ({
  useWorkspaceData: () => workspaceDataMock,
}));

vi.mock("@/context/SessionContext", () => ({
  useSessionActions: () => ({
    goToLogin,
    goToRoom,
    startCreateFlow,
    setScreen,
  }),
}));

vi.mock("@/lib/workspace-service", () => ({
  requestTeamAccess: (...args: unknown[]) => requestTeamAccess(...args),
}));

vi.mock("@/config/routes", () => ({
  navigateTo: (...args: unknown[]) => navigateTo(...args),
}));

vi.mock("@/components/ui", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock("@/components/workspace/WorkspaceLayout", () => ({
  WorkspaceLayout: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/workspace/TeamSelector", () => ({
  TeamSelector: () => <div>Team selector</div>,
}));

vi.mock("@/components/workspace/SessionList", () => ({
  SessionList: ({ sessions }: { sessions: TeamSession[] }) => (
    <div>Session list {sessions.map((session) => session.name).join(", ")}</div>
  ),
}));

vi.mock("@/components/workspace/TeamInsightsPanel", () => ({
  TeamInsightsPanel: () => <div>Insights</div>,
}));

vi.mock("@/components/ui/SurfaceCard", () => ({
  SurfaceCard: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/Badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/EmptyState", () => ({
  EmptyState: ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock("@/components/ui/Alert", () => ({
  Alert: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/Button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/BetaBadge", () => ({
  BetaBadge: () => <span>Beta</span>,
}));

import WorkspaceSessions from "@/routes/workspace/WorkspaceSessions";

describe("WorkspaceSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workspaceDataMock.teams = [restrictedTeam];
    workspaceDataMock.sessions = [];
    workspaceDataMock.selectedTeamId = restrictedTeam.id;
  });

  it("requests access for a restricted team", async () => {
    requestTeamAccess.mockResolvedValue(undefined);

    render(<WorkspaceSessions />);

    fireEvent.click(screen.getByRole("button", { name: "Request access" }));

    await waitFor(() => {
      expect(requestTeamAccess).toHaveBeenCalledWith(10);
    });
    expect(refreshWorkspace).toHaveBeenCalledWith(true);
    expect(toastSuccess).toHaveBeenCalledWith("Access request sent");
  });

  it("shows pending access state without a request button", () => {
    workspaceDataMock.teams = [
      {
        ...restrictedTeam,
        currentUserStatus: "pending",
      },
    ];

    render(<WorkspaceSessions />);

    expect(
      screen.getByText("Your access request is pending team admin approval."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Request access" })).toBeNull();
  });

  it("filters standups separately from planning sessions", () => {
    workspaceDataMock.teams = [accessibleTeam];
    workspaceDataMock.sessions = [planningSession, standupSession];
    workspaceDataMock.selectedTeamId = accessibleTeam.id;

    render(<WorkspaceSessions />);

    expect(
      screen.getByText("Session list Sprint 12 Planning, Daily Standup"),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Standups \(1\)/ }));

    expect(screen.getByText("Session list Daily Standup")).toBeTruthy();
  });
});
