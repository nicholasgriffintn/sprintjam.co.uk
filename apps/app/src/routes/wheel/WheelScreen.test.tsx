// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, beforeEach, expect, vi } from "vitest";

import WheelScreen from "./WheelScreen";
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

describe("WheelScreen", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/wheel");
    window.scrollTo = vi.fn();
    vi.mocked(createWheel).mockReset();
    vi.mocked(joinWheel).mockReset();
  });

  it("does not retry createWheel when the initial call fails", async () => {
    vi.mocked(createWheel).mockRejectedValue(new Error("boom"));

    render(<WheelScreen />);

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

    render(<WheelScreen />);

    await waitFor(() => {
      expect(getWheelAccessSettings).toHaveBeenCalledTimes(1);
    });

    const passcodeInput = await screen.findByRole("textbox", {
      name: /Passcode/i,
    });
    expect(passcodeInput).toBeDefined();

    const logo = await screen.findByAltText("SprintJam");
    expect(logo).toBeInTheDocument();
  });
});
