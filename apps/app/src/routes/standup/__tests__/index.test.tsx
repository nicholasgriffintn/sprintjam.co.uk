// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigateTo = vi.fn();

vi.mock("@/hooks/useAppNavigation", () => ({
  useAppNavigation: () => mockNavigateTo,
}));

import StandupRoute from "@/routes/standup/index";

describe("StandupRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading feedback when opening the create flow", async () => {
    render(<StandupRoute />);

    const createButton = screen.getByTestId("create-standup-button");

    fireEvent.click(createButton);

    expect(mockNavigateTo).toHaveBeenCalledWith("standupCreate");
    await waitFor(() => {
      expect(createButton.querySelector(".animate-spin")).toBeTruthy();
    });
  });

  it("shows loading feedback when opening the join flow", async () => {
    render(<StandupRoute />);

    const joinButton = screen.getByTestId("join-standup-button");

    fireEvent.click(joinButton);

    expect(mockNavigateTo).toHaveBeenCalledWith("standupJoin");
    await waitFor(() => {
      expect(joinButton.querySelector(".animate-spin")).toBeTruthy();
    });
  });
});
