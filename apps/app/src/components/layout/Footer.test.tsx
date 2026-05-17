// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { Footer } from "@/components/layout/Footer";

const roomActions = vi.hoisted(() => ({
  handleStartGame: vi.fn(),
}));

vi.mock("@/context/RoomContext", () => ({
  useRoomActions: () => roomActions,
  useRoomState: () => ({
    roomData: {
      key: "ROOM1",
    },
  }),
}));

vi.mock("@/components/games/RoomGamesModal", () => ({
  RoomGamesModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div role="dialog" aria-label="Party games" /> : null,
}));

const renderFooter = (footer: ReactElement) =>
  render(<MemoryRouter>{footer}</MemoryRouter>);

describe("Footer", () => {
  it("keeps party games hidden by default", () => {
    renderFooter(<Footer />);

    expect(screen.queryByRole("button", { name: "Party games" })).toBeNull();
  });

  it("shows party games when the display flag is provided", () => {
    renderFooter(<Footer displayPartyGames />);

    fireEvent.click(screen.getByRole("button", { name: "Party games" }));

    expect(screen.getByRole("dialog", { name: "Party games" })).toBeTruthy();
  });
});
