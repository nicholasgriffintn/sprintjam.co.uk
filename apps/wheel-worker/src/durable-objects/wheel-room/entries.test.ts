import { describe, it, expect, vi } from "vitest";
import type { WheelData } from "@sprintjam/types";
import type { WheelRoom } from ".";

import {
  handleAddEntry,
  handleRemoveEntry,
  handleUpdateEntry,
  handleToggleEntry,
  handleClearEntries,
  handleBulkAddEntries,
} from "./entries";

const baseWheelData: WheelData = {
  key: "wheel",
  entries: [],
  moderator: "mod",
  users: [],
  connectedUsers: {},
  spinState: {
    isSpinning: true,
    startedAt: Date.now(),
    targetIndex: 0,
    duration: 2000,
  },
  results: [],
  settings: {
    removeWinnerAfterSpin: false,
    showConfetti: true,
    playSounds: true,
    spinDurationMs: 2000,
  },
  status: "active",
};

const createWheel = (wheelData: WheelData): WheelRoom =>
  ({
    getWheelData: vi.fn().mockResolvedValue(wheelData),
    repository: {
      addEntry: vi.fn(),
      removeEntry: vi.fn(),
      updateEntry: vi.fn(),
      toggleEntry: vi.fn(),
      clearEntries: vi.fn(),
      getEntries: vi.fn().mockReturnValue([]),
    },
    broadcast: vi.fn(),
  }) as unknown as WheelRoom;

describe("wheel entries", () => {
  it.each([
    ["add entry", (wheel: WheelRoom) => handleAddEntry(wheel, "mod", "One")],
    [
      "remove entry",
      (wheel: WheelRoom) => handleRemoveEntry(wheel, "mod", "entry-1"),
    ],
    [
      "update entry",
      (wheel: WheelRoom) => handleUpdateEntry(wheel, "mod", "entry-1", "Two"),
    ],
    [
      "toggle entry",
      (wheel: WheelRoom) => handleToggleEntry(wheel, "mod", "entry-1", true),
    ],
    ["clear entries", (wheel: WheelRoom) => handleClearEntries(wheel, "mod")],
    [
      "bulk add entries",
      (wheel: WheelRoom) => handleBulkAddEntries(wheel, "mod", ["One", "Two"]),
    ],
  ])("blocks %s while spinning", async (_label, action) => {
    const wheel = createWheel(baseWheelData);
    await expect(action(wheel)).rejects.toThrow(
      "Cannot modify entries while spinning",
    );
  });
});
