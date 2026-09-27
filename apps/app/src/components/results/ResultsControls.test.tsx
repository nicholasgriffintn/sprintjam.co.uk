// @vitest-environment jsdom
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getDefaultRoomSettings } from "@sprintjam/utils";

import type { RoomData } from "@/types";
import { ResultsControls } from "./ResultsControls";

const roomData: RoomData = {
  key: "room",
  users: ["Alice", "Bob"],
  votes: { Alice: 5, Bob: 3 },
  showVotes: false,
  moderator: "Alice",
  judgeScore: null,
  connectedUsers: { Alice: true, Bob: true },
  settings: getDefaultRoomSettings(),
};

const props = {
  roomData,
  isModeratorView: true,
  onToggleShowVotes: vi.fn(),
  onNextTicket: vi.fn(),
};

describe("ResultsControls", () => {
  it.each([false, true])(
    "requires confirmation while votes are hidden with auto reveal set to %s",
    async (enableAutoReveal) => {
      const onResetVotes = vi.fn();
      render(
        <ResultsControls
          {...props}
          roomData={{
            ...roomData,
            settings: { ...roomData.settings, enableAutoReveal },
          }}
          onResetVotes={onResetVotes}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Reset Votes" }));

      const dialog = await screen.findByRole("alertdialog", {
        name: "Reset hidden votes?",
      });
      expect(dialog.textContent).toContain("This cannot be undone.");
      expect(onResetVotes).not.toHaveBeenCalled();

      fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
      await waitFor(() => {
        expect(screen.queryByRole("alertdialog")).toBeNull();
      });
      expect(onResetVotes).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "Reset Votes" }));
      fireEvent.click(
        within(await screen.findByRole("alertdialog")).getByRole("button", {
          name: "Reset votes",
        }),
      );
      expect(onResetVotes).toHaveBeenCalledOnce();
      await waitFor(() => {
        expect(screen.queryByRole("alertdialog")).toBeNull();
      });
    },
  );

  it.each([false, true])(
    "resets immediately after reveal with auto reveal set to %s",
    (enableAutoReveal) => {
      const onResetVotes = vi.fn();
      const hiddenRoom = {
        ...roomData,
        settings: { ...roomData.settings, enableAutoReveal },
      };
      const { rerender } = render(
        <ResultsControls
          {...props}
          roomData={hiddenRoom}
          onResetVotes={onResetVotes}
        />,
      );

      rerender(
        <ResultsControls
          {...props}
          roomData={{ ...hiddenRoom, showVotes: true }}
          onResetVotes={onResetVotes}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Reset Votes" }));

      expect(onResetVotes).toHaveBeenCalledOnce();
      expect(screen.queryByRole("alertdialog")).toBeNull();
    },
  );

  it("guards participant resets when permitted and hides the control otherwise", async () => {
    const onResetVotes = vi.fn();
    const { rerender } = render(
      <ResultsControls
        {...props}
        isModeratorView={false}
        roomData={{
          ...roomData,
          settings: {
            ...roomData.settings,
            allowOthersToDeleteEstimates: false,
          },
        }}
        onResetVotes={onResetVotes}
      />,
    );
    expect(screen.queryByRole("button", { name: "Reset Votes" })).toBeNull();

    rerender(
      <ResultsControls
        {...props}
        isModeratorView={false}
        roomData={{
          ...roomData,
          settings: {
            ...roomData.settings,
            allowOthersToDeleteEstimates: true,
          },
        }}
        onResetVotes={onResetVotes}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reset Votes" }));
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    expect(onResetVotes).not.toHaveBeenCalled();
  });
});
