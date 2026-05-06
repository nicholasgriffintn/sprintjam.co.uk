/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  TeamSession,
  TeamSessionsPage,
  WorkspaceTeam,
} from "@sprintjam/types";

const toastSuccess = vi.hoisted(() => vi.fn());

const refreshWorkspace = vi.fn();
const goToLogin = vi.fn();
const goToRoom = vi.fn();
const startCreateFlow = vi.fn();
const requestTeamAccess = vi.fn();
const listTeamSessionsPage = vi.fn();
const navigateTo = vi.fn();
const loaderDataMock = {
  sessionsByTeamId: {},
  teamInsightsByTeamId: {},
  actionsByTeamId: {},
  processLoopsByTeamId: {},
};

const restrictedTeam: WorkspaceTeam = {
  id: 10,
  slug: "amber-cobalt-ripple",
  name: "Platform",
  logoUrl: null,
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

const wheelSession: TeamSession = {
  id: 3,
  teamId: 10,
  roomKey: "WHEEL7",
  name: "Retro Wheel",
  createdById: 1,
  createdAt: Date.now(),
  completedAt: null,
  metadata: JSON.stringify({ type: "wheel" }),
};

function createSessionsPage(
  sessions: TeamSession[],
  overrides: Partial<TeamSessionsPage> = {},
): TeamSessionsPage {
  return {
    sessions,
    pagination: {
      limit: sessions.length || 20,
      offset: 0,
      total: sessions.length,
      hasMore: false,
      nextOffset: null,
    },
    counts: {
      all: sessions.length,
      planning: sessions.filter((session) => session.metadata === null).length,
      standup: sessions.filter((session) =>
        session.metadata?.includes("standup"),
      ).length,
      wheel: sessions.filter((session) => session.metadata?.includes("wheel"))
        .length,
    },
    ...overrides,
  };
}

vi.mock("@/hooks/useWorkspaceData", () => ({
  useWorkspaceData: () => workspaceDataMock,
}));

vi.mock("@/context/SessionContext", () => ({
  useSessionActions: () => ({
    goToLogin,
    goToRoom,
    startCreateFlow,
  }),
}));

vi.mock("@/lib/workspace-service", () => ({
  requestTeamAccess: (...args: unknown[]) => requestTeamAccess(...args),
  listTeamSessionsPage: (...args: unknown[]) => listTeamSessionsPage(...args),
  getTeamInsights: () => Promise.resolve(null),
  getBatchSessionStats: () => Promise.resolve({}),
}));

vi.mock("@/hooks/useAppNavigation", () => ({
  useAppNavigation: () => navigateTo,
}));

vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router");

  return {
    ...actual,
    useLoaderData: () => loaderDataMock,
  };
});

vi.mock("@/components/ui/Toast", () => ({
  AppToastProvider: () => null,
  toast: {
    success: toastSuccess,
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
  useToast: () => ({ toasts: [] }),
}));

import WorkspaceSessions from "@/routes/workspace/sessions";

describe("WorkspaceSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workspaceDataMock.teams = [restrictedTeam];
    workspaceDataMock.sessions = [];
    workspaceDataMock.selectedTeamId = restrictedTeam.id;
    loaderDataMock.sessionsByTeamId = {};
    loaderDataMock.teamInsightsByTeamId = {};
    loaderDataMock.actionsByTeamId = {};
    loaderDataMock.processLoopsByTeamId = {};
    listTeamSessionsPage.mockReset();
  });

  it("requests access for a restricted team", async () => {
    requestTeamAccess.mockResolvedValue(undefined);

    render(<WorkspaceSessions />);

    fireEvent.click(screen.getByRole("button", { name: "Request access" }));

    await waitFor(() => {
      expect(requestTeamAccess).toHaveBeenCalledWith("amber-cobalt-ripple");
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

  it("filters standups and wheels separately from planning sessions", async () => {
    workspaceDataMock.teams = [accessibleTeam];
    workspaceDataMock.sessions = [planningSession, standupSession, wheelSession];
    workspaceDataMock.selectedTeamId = accessibleTeam.id;
    loaderDataMock.sessionsByTeamId = {
      [accessibleTeam.id]: createSessionsPage([
        planningSession,
        standupSession,
        wheelSession,
      ]),
    };
    listTeamSessionsPage.mockImplementation((_teamId: number, options) => {
      if (options.type === "standup") {
        return Promise.resolve(
          createSessionsPage([standupSession], {
            pagination: {
              limit: 20,
              offset: 0,
              total: 1,
              hasMore: false,
              nextOffset: null,
            },
            counts: {
              all: 3,
              planning: 1,
              standup: 1,
              wheel: 1,
            },
          }),
        );
      }

      return Promise.resolve(
        createSessionsPage([wheelSession], {
          pagination: {
            limit: 20,
            offset: 0,
            total: 1,
            hasMore: false,
            nextOffset: null,
          },
          counts: {
            all: 3,
            planning: 1,
            standup: 1,
            wheel: 1,
          },
        }),
      );
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <WorkspaceSessions />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Sprint 12 Planning")).toBeTruthy();
    expect(screen.getByText("Daily Standup")).toBeTruthy();
    expect(screen.getByText("Retro Wheel")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Standups (1)" }));

    expect(await screen.findByText("Daily Standup")).toBeTruthy();
    expect(screen.queryByText("Sprint 12 Planning")).toBeNull();
    expect(listTeamSessionsPage).toHaveBeenCalledWith("amber-cobalt-ripple", {
      limit: 20,
      offset: 0,
      type: "standup",
    });

    fireEvent.click(screen.getByRole("tab", { name: "Wheels (1)" }));

    expect(await screen.findByText("Retro Wheel")).toBeTruthy();
    expect(screen.queryByText("Daily Standup")).toBeNull();
  });

  it("opens linked sessions in a new tab", () => {
    workspaceDataMock.teams = [accessibleTeam];
    workspaceDataMock.sessions = [planningSession, standupSession, wheelSession];
    workspaceDataMock.selectedTeamId = accessibleTeam.id;
    loaderDataMock.sessionsByTeamId = {
      [accessibleTeam.id]: createSessionsPage([
        planningSession,
        standupSession,
        wheelSession,
      ]),
    };

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <WorkspaceSessions />
      </QueryClientProvider>,
    );

    const openRoom = screen.getByRole("link", { name: "Open room" });
    const openStandup = screen.getByRole("link", { name: "Open standup" });
    const openWheel = screen.getByRole("link", { name: "Open wheel" });

    expect(openRoom.getAttribute("href")).toBe("/room/ROOM42");
    expect(openRoom.getAttribute("target")).toBe("_blank");
    expect(openRoom.getAttribute("rel")).toBe("noreferrer");
    expect(openStandup.getAttribute("href")).toBe("/standup/join/STAND9");
    expect(openStandup.getAttribute("target")).toBe("_blank");
    expect(openWheel.getAttribute("href")).toBe("/wheel/WHEEL7");
    expect(openWheel.getAttribute("target")).toBe("_blank");
  });

  it("loads the next sessions page for the selected team", async () => {
    workspaceDataMock.teams = [accessibleTeam];
    workspaceDataMock.sessions = [planningSession];
    workspaceDataMock.selectedTeamId = accessibleTeam.id;
    loaderDataMock.sessionsByTeamId = {
      [accessibleTeam.id]: createSessionsPage([planningSession], {
        pagination: {
          limit: 1,
          offset: 0,
          total: 2,
          hasMore: true,
          nextOffset: 1,
        },
        counts: {
          all: 2,
          planning: 1,
          standup: 1,
          wheel: 0,
        },
      }),
    };
    listTeamSessionsPage.mockResolvedValue({
      sessions: [standupSession],
      pagination: {
        limit: 20,
        offset: 1,
        total: 2,
        hasMore: false,
        nextOffset: null,
      },
      counts: {
        all: 2,
        planning: 1,
        standup: 1,
        wheel: 0,
      },
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <WorkspaceSessions />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Load more sessions" }));

    await waitFor(() => {
      expect(listTeamSessionsPage).toHaveBeenCalledWith("amber-cobalt-ripple", {
        limit: 20,
        offset: 1,
        type: "all",
      });
    });
    expect(await screen.findByText("Daily Standup")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Load more sessions" }),
    ).toBeNull();
  });
});
