// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createRetro } from "@/lib/retro-api-service";

const mockNavigateTo = vi.fn();
const mockPersistUserName = vi.fn();
const mockEnsureWorkspaceRetroSession = vi.fn();

const workspaceDataMock = {
  user: null as { name: string; email: string; avatar: string } | null,
  teams: [] as Array<{
    id: number;
    slug: string;
    name: string;
    canAccess: boolean;
  }>,
  selectedTeamId: null as number | null,
  setSelectedTeamId: vi.fn(),
  isAuthenticated: false,
};

vi.mock("@/hooks/useAppNavigation", () => ({
  useAppNavigation: () => mockNavigateTo,
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

vi.mock("@/lib/retro-api-service", () => ({
  createRetro: vi.fn(),
}));

vi.mock("@/lib/workspace-service", () => ({
  getTeamRetroSettings: vi.fn(),
}));

vi.mock("@/components/ui", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("./useWorkspaceRetroSession", () => ({
  useWorkspaceRetroSession: () => mockEnsureWorkspaceRetroSession,
}));

const mockResponse = {
  success: true,
  retro: {
    key: "RET123",
    template: "start-stop-continue",
  },
};

import { RetroCreateScreen } from "./RetroCreateScreen";

describe("RetroCreateScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workspaceDataMock.user = null;
    workspaceDataMock.teams = [];
    workspaceDataMock.selectedTeamId = null;
    workspaceDataMock.isAuthenticated = false;
    mockEnsureWorkspaceRetroSession.mockResolvedValue(undefined);
  });

  it("keeps the create button loading after successful navigation starts", async () => {
    vi.mocked(createRetro).mockResolvedValue(mockResponse as never);

    render(<RetroCreateScreen />);

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Alice" },
    });
    const button = screen.getByRole("button", { name: /create retro/i });
    fireEvent.submit(button.closest("form")!);

    await waitFor(() => {
      expect(mockNavigateTo).toHaveBeenCalledWith("retroRoom", {
        retroKey: "RET123",
      });
    });

    expect(button.querySelector(".animate-spin")).toBeTruthy();
    expect(mockPersistUserName).toHaveBeenCalledWith("Alice");
  });
});
