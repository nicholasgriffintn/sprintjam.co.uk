// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { joinRetro } from "@/lib/retro-api-service";

const mockNavigateTo = vi.fn();
const mockPersistUserName = vi.fn();

vi.mock("@/hooks/useAppNavigation", () => ({
  useAppNavigation: () => mockNavigateTo,
}));

vi.mock("@/hooks/useUserPersistence", () => ({
  useUserPersistence: vi.fn(),
  getStoredUserName: () => "",
  getStoredUserAvatar: () => null,
  persistUserName: (...args: unknown[]) => mockPersistUserName(...args),
}));

vi.mock("@/lib/retro-api-service", () => ({
  joinRetro: vi.fn(),
}));

const mockResponse = {
  success: true,
  retro: {
    key: "RET123",
  },
};

import { RetroJoinScreen } from "./RetroJoinScreen";

describe("RetroJoinScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the join button loading after successful navigation starts", async () => {
    vi.mocked(joinRetro).mockResolvedValue(mockResponse as never);

    render(<RetroJoinScreen />);

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Bob" },
    });
    fireEvent.change(screen.getByLabelText(/retro code/i), {
      target: { value: "RET123" },
    });
    const button = screen.getByRole("button", { name: /join retro/i });
    fireEvent.submit(button.closest("form")!);

    await waitFor(() => {
      expect(mockNavigateTo).toHaveBeenCalledWith("retroRoom", {
        retroKey: "RET123",
      });
    });

    expect(button.querySelector(".animate-spin")).toBeTruthy();
    expect(mockPersistUserName).toHaveBeenCalledWith("Bob");
  });
});
