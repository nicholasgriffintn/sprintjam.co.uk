/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockStartCreateFlow = vi.fn();
const mockNavigateTo = vi.fn();

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.mock("@/context/SessionContext", () => ({
  useSessionActions: () => ({
    startCreateFlow: mockStartCreateFlow,
  }),
}));

vi.mock("@/hooks/useAppNavigation", () => ({
  useAppNavigation: () => mockNavigateTo,
}));

import WelcomeRoute from "@/routes/_index";

describe("WelcomeRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, "IntersectionObserver", {
      configurable: true,
      writable: true,
      value: MockIntersectionObserver,
    });
  });

  it("shows loading feedback when opening the planning create flow", async () => {
    render(<WelcomeRoute />);

    const createButton = screen.getByTestId("create-room-button");
    fireEvent.click(createButton);

    expect(mockNavigateTo).toHaveBeenCalledWith("create");
    await waitFor(() => {
      expect(createButton.querySelector(".animate-spin")).toBeTruthy();
    });
  });

  it("shows loading feedback when opening the planning join flow", async () => {
    render(<WelcomeRoute />);

    const joinButton = screen.getByTestId("join-room-button");
    fireEvent.click(joinButton);

    expect(mockNavigateTo).toHaveBeenCalledWith("join");
    await waitFor(() => {
      expect(joinButton.querySelector(".animate-spin")).toBeTruthy();
    });
  });
});
