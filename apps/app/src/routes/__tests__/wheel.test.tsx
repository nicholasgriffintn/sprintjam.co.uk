// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, beforeEach, expect, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import WheelRoute from "../wheel";
import WheelKeyRoute from "../wheel/$wheelKey";
import { WheelHeaderProvider } from "@/context/WheelHeaderContext";
import {
  createWheel,
  getWheelAccessSettings,
  joinWheel,
} from "@/lib/wheel-api-service";
import {
  createTeamSession,
  getTeamSessionByRoomKey,
} from "@/lib/workspace-service";

const navigateToMock = vi.hoisted(() => vi.fn());
const workspaceDataMock = vi.hoisted(() => ({
  teams: [] as Array<{ id: number; canAccess: boolean }>,
  selectedTeamId: null as number | null,
}));

vi.mock("@/lib/wheel-api-service", () => ({
  addEntry: vi.fn(),
  bulkAddEntries: vi.fn(),
  clearEntries: vi.fn(),
  connectToWheel: vi.fn(),
  createWheel: vi.fn(),
  disconnectFromWheel: vi.fn(),
  getWheelAccessSettings: vi.fn(),
  getCachedWheel: vi.fn(() => null),
  joinWheel: vi.fn(),
  removeEntry: vi.fn(),
  resetWheel: vi.fn(),
  spin: vi.fn(),
  toggleEntry: vi.fn(),
  updateEntry: vi.fn(),
  updateWheelSettings: vi.fn(),
}));

vi.mock("@/hooks/useAppNavigation", () => ({
  useAppNavigation: () => navigateToMock,
}));

vi.mock("@/hooks/useWorkspaceData", () => ({
  useWorkspaceData: () => workspaceDataMock,
}));

vi.mock("@/lib/workspace-service", () => ({
  createTeamSession: vi.fn(),
  getTeamSessionByRoomKey: vi.fn(),
}));

describe("WheelRoute", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/wheel");
    window.scrollTo = vi.fn();
    window.localStorage.clear();
    navigateToMock.mockReset();
    vi.mocked(createWheel).mockReset();
    vi.mocked(getWheelAccessSettings).mockReset();
    vi.mocked(joinWheel).mockReset();
    vi.mocked(createTeamSession).mockReset();
    vi.mocked(getTeamSessionByRoomKey).mockReset();
    vi.mocked(getTeamSessionByRoomKey).mockResolvedValue(null);
    workspaceDataMock.teams = [];
    workspaceDataMock.selectedTeamId = null;
  });

  it("does not retry createWheel when the initial call fails", async () => {
    vi.mocked(createWheel).mockRejectedValue(new Error("boom"));

    render(<WheelRoute />);

    await waitFor(() => {
      expect(createWheel).toHaveBeenCalledTimes(1);
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(createWheel).toHaveBeenCalledTimes(1);
    expect(joinWheel).not.toHaveBeenCalled();
  });

  it("redirects after creating a wheel without mounting the created room first", async () => {
    vi.mocked(createWheel).mockResolvedValue({
      token: "token",
      recoveryPasskey: "ABCD-EFGH",
      wheel: {
        key: "531N72",
        entries: [],
        users: ["User-test"],
        connectedUsers: { "User-test": false },
        moderator: "User-test",
        spinState: null,
        results: [],
        settings: {
          removeWinnerAfterSpin: false,
          showConfetti: true,
          playSounds: true,
          spinDurationMs: 4000,
        },
        status: "active",
      },
    });

    render(<WheelRoute />);

    await waitFor(() => {
      expect(navigateToMock).toHaveBeenCalledWith(
        "wheel",
        { wheelKey: "531N72" },
        { replace: true },
      );
    });

    expect(screen.getByText("Creating your wheel...")).toBeTruthy();
    expect(joinWheel).not.toHaveBeenCalled();
  });

  it("links created wheels to the selected workspace team", async () => {
    workspaceDataMock.teams = [{ id: 7, canAccess: true }];
    workspaceDataMock.selectedTeamId = 7;
    vi.mocked(createWheel).mockResolvedValue({
      token: "token",
      recoveryPasskey: "ABCD-EFGH",
      wheel: {
        key: "531N72",
        entries: [],
        users: ["User-test"],
        connectedUsers: { "User-test": false },
        moderator: "User-test",
        spinState: null,
        results: [],
        settings: {
          removeWinnerAfterSpin: false,
          showConfetti: true,
          playSounds: true,
          spinDurationMs: 4000,
        },
        status: "active",
      },
    });

    render(<WheelRoute />);

    await waitFor(() => {
      expect(getTeamSessionByRoomKey).toHaveBeenCalledWith("531N72");
      expect(createTeamSession).toHaveBeenCalledWith(
        7,
        expect.stringMatching(/^Wheel /),
        "531N72",
        expect.objectContaining({
          type: "wheel",
          processLoop: expect.objectContaining({
            key: expect.stringMatching(/^team-7-/),
            name: expect.stringMatching(/^Team loop /),
          }),
        }),
      );
    });
  });

  it("links joined wheels to the selected workspace team before mounting", async () => {
    workspaceDataMock.teams = [{ id: 7, canAccess: true }];
    workspaceDataMock.selectedTeamId = 7;
    vi.mocked(getWheelAccessSettings).mockResolvedValue({
      settings: {
        removeWinnerAfterSpin: false,
        showConfetti: true,
        playSounds: true,
        spinDurationMs: 4000,
      },
      moderator: "Moderator",
      isModerator: true,
      hasPasscode: false,
    });
    vi.mocked(joinWheel).mockResolvedValue({
      token: "token",
      recoveryPasskey: "ABCD-EFGH",
      wheel: {
        key: "0F2D3D",
        entries: [],
        users: ["User-test"],
        connectedUsers: { "User-test": false },
        moderator: "User-test",
        spinState: null,
        results: [],
        settings: {
          removeWinnerAfterSpin: false,
          showConfetti: true,
          playSounds: true,
          spinDurationMs: 4000,
        },
        status: "active",
      },
    });

    render(
      <WheelHeaderProvider>
        <MemoryRouter initialEntries={["/wheel/0F2D3D"]}>
          <Routes>
            <Route path="/wheel/:wheelKey" element={<WheelKeyRoute />} />
          </Routes>
        </MemoryRouter>
      </WheelHeaderProvider>,
    );

    await waitFor(() => {
      expect(createTeamSession).toHaveBeenCalledWith(
        7,
        expect.stringMatching(/^Wheel /),
        "0F2D3D",
        expect.objectContaining({
          type: "wheel",
          processLoop: expect.objectContaining({
            key: expect.stringMatching(/^team-7-/),
          }),
        }),
      );
    });
  });

  it("shows an inline passcode input when joining a protected wheel", async () => {
    window.history.replaceState(null, "", "/wheel/ABC123");
    vi.mocked(getWheelAccessSettings).mockResolvedValue({
      settings: {
        removeWinnerAfterSpin: false,
        showConfetti: true,
        playSounds: true,
        spinDurationMs: 4000,
      },
      moderator: "Moderator",
      isModerator: false,
      hasPasscode: true,
    });

    render(
      <MemoryRouter initialEntries={["/wheel/ABC123"]}>
        <Routes>
          <Route path="/wheel/:wheelKey" element={<WheelKeyRoute />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getWheelAccessSettings).toHaveBeenCalledTimes(1);
    });

    const passcodeInput = await screen.findByRole("textbox", {
      name: /Passcode/i,
    });
    expect(passcodeInput).toBeDefined();
  });
});
