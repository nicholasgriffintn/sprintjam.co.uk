// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@/lib/errors";
import { joinStandup, recoverStandupSession } from "@/lib/standup-api-service";

const mockNavigateTo = vi.fn();
const mockPersistUserName = vi.fn();

vi.mock("@/hooks/useWorkspaceData", () => ({
  useWorkspaceData: () => ({ user: null }),
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
  joinStandup: vi.fn(),
  recoverStandupSession: vi.fn(),
}));

vi.mock("@/utils/storage", () => ({
  safeLocalStorage: { get: vi.fn(() => null), set: vi.fn(), remove: vi.fn() },
}));

vi.mock("@/hooks/useAppNavigation", () => ({
  useAppNavigation: () => mockNavigateTo,
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

import StandupJoinRoute from "@/routes/standup/room";

describe("StandupJoinRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, "", "/standup/join");
  });

  it("renders the name, key, and passcode fields", () => {
    render(<StandupJoinRoute />);

    expect(screen.getByLabelText(/your name/i)).toBeTruthy();
    expect(screen.getByLabelText(/standup key/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /join standup/i })).toBeTruthy();
  });

  it("pre-fills the standup key from the URL path", () => {
    render(
      <MemoryRouter initialEntries={["/standup/join/XYZ789"]}>
        <Routes>
          <Route
            path="/standup/join/:standupKey"
            element={<StandupJoinRoute />}
          />
        </Routes>
      </MemoryRouter>,
    );

    const keyInput = screen.getByLabelText(/standup key/i) as HTMLInputElement;
    expect(keyInput.value).toBe("XYZ789");
  });

  it("calls joinStandup and navigates to the room on success", async () => {
    vi.mocked(joinStandup).mockResolvedValue(mockResponse);

    render(<StandupJoinRoute />);

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Bob" },
    });
    fireEvent.change(screen.getByLabelText(/standup key/i), {
      target: { value: "ABC123" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: /join standup/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(joinStandup).toHaveBeenCalledWith(
        "Bob",
        "ABC123",
        undefined,
        undefined,
      );
    });
    expect(mockPersistUserName).toHaveBeenCalledWith("Bob");
    expect(mockNavigateTo).toHaveBeenCalledWith("standupRoom", {
      standupKey: "ABC123",
    });
  });

  it("shows a passcode error when the room requires one", async () => {
    vi.mocked(joinStandup).mockRejectedValue(new Error("PASSCODE_REQUIRED"));

    render(<StandupJoinRoute />);

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Bob" },
    });
    fireEvent.change(screen.getByLabelText(/standup key/i), {
      target: { value: "ABC123" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: /join standup/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/this standup requires a passcode/i),
      ).toBeTruthy();
    });
  });

  it("shows a wrong-passcode error when a passcode was supplied but rejected", async () => {
    vi.mocked(joinStandup).mockRejectedValue(new Error("PASSCODE_REQUIRED"));

    render(<StandupJoinRoute />);

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Bob" },
    });
    fireEvent.change(screen.getByLabelText(/standup key/i), {
      target: { value: "ABC123" },
    });
    fireEvent.change(
      screen.getByPlaceholderText(/enter passcode if required/i),
      {
        target: { value: "wrong" },
      },
    );
    fireEvent.submit(
      screen.getByRole("button", { name: /join standup/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(screen.getByText(/incorrect passcode/i)).toBeTruthy();
    });
  });

  it("shows the conflict recovery UI when the name is already connected", async () => {
    vi.mocked(joinStandup).mockRejectedValue(
      new HttpError({ message: "Conflict", status: 409 }),
    );

    render(<StandupJoinRoute />);

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Bob" },
    });
    fireEvent.change(screen.getByLabelText(/standup key/i), {
      target: { value: "ABC123" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: /join standup/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(screen.getByText(/this name is already connected/i)).toBeTruthy();
    });
  });

  it("calls recoverStandupSession then joinStandup when recovering a session", async () => {
    vi.mocked(joinStandup)
      .mockRejectedValueOnce(
        new HttpError({ message: "Conflict", status: 409 }),
      )
      .mockResolvedValueOnce(mockResponse);
    vi.mocked(recoverStandupSession).mockResolvedValue(undefined);

    render(<StandupJoinRoute />);

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Bob" },
    });
    fireEvent.change(screen.getByLabelText(/standup key/i), {
      target: { value: "ABC123" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: /join standup/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(screen.getByText(/this name is already connected/i)).toBeTruthy();
    });

    fireEvent.change(screen.getByPlaceholderText("XXXX-XXXX"), {
      target: { value: "ABCD-1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /recover session/i }));

    await waitFor(() => {
      expect(recoverStandupSession).toHaveBeenCalledWith(
        "Bob",
        "ABC123",
        "ABCD-1234",
      );
    });

    expect(mockPersistUserName).toHaveBeenCalledWith("Bob");
  });
});
