// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, beforeEach, expect, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import WheelRoute from "./wheel";
import WheelKeyRoute from "./wheel/$wheelKey";
import {
  createWheel,
  getWheelAccessSettings,
  joinWheel,
} from "@/lib/wheel-api-service";

vi.mock("@/lib/wheel-api-service", () => ({
  createWheel: vi.fn(),
  getWheelAccessSettings: vi.fn(),
  joinWheel: vi.fn(),
}));

vi.mock("@/hooks/useAppNavigation", () => ({
  useAppNavigation: () => vi.fn(),
}));

describe("WheelRoute", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/wheel");
    window.scrollTo = vi.fn();
    vi.mocked(createWheel).mockReset();
    vi.mocked(joinWheel).mockReset();
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
