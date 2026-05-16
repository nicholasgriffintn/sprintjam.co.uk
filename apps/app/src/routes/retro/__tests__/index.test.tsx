// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigateTo = vi.fn();

vi.mock("@/hooks/useAppNavigation", () => ({
  useAppNavigation: () => mockNavigateTo,
}));

import RetroIndexRoute from "@/routes/retro/index";

describe("RetroIndexRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading feedback when opening the create flow", async () => {
    render(
      <MemoryRouter>
        <RetroIndexRoute />
      </MemoryRouter>,
    );

    const createButton = screen.getAllByRole("button", {
      name: /create retro/i,
    })[0];
    fireEvent.click(createButton);

    expect(mockNavigateTo).toHaveBeenCalledWith("retroCreate");
    await waitFor(() => {
      expect(createButton.querySelector(".animate-spin")).toBeTruthy();
    });
  });
});
