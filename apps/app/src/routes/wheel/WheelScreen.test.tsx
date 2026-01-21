// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { describe, it, beforeEach, expect, vi } from "vitest";

import WheelScreen from "./WheelScreen";
import { createWheel, joinWheel } from "@/lib/wheel-api-service";

vi.mock("@/lib/wheel-api-service", () => ({
  createWheel: vi.fn(),
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
});
