import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { WheelData } from "@sprintjam/types";
import type { WheelRoom } from ".";

import {
  handleSpin,
  handleSpinComplete,
  handleResetWheel,
  handleUpdateSettings,
} from "./spin";

const buildWheelData = (overrides: Partial<WheelData> = {}): WheelData => ({
  key: "wheel",
  entries: [],
  moderator: "mod",
  users: ["mod"],
  connectedUsers: { mod: true },
  spinState: null,
  results: [],
  settings: {
    removeWinnerAfterSpin: false,
    showConfetti: false,
    playSounds: false,
    spinDurationMs: 4000,
  },
  status: "active",
  ...overrides,
});

const createWheel = (wheelData: WheelData, entriesAfter?: WheelData["entries"]) =>
  ({
    getWheelData: vi.fn().mockResolvedValue(wheelData),
    state: {
      storage: {
        setAlarm: vi.fn(),
      },
    },
    repository: {
      setSpinState: vi.fn(),
      addResult: vi.fn(),
      removeEntry: vi.fn(),
      setSettings: vi.fn(),
      clearResults: vi.fn(),
      clearEntries: vi.fn(),
      getEntries: vi.fn().mockReturnValue(entriesAfter ?? wheelData.entries),
    },
    broadcast: vi.fn(),
  }) as unknown as WheelRoom;

describe("wheel spin handlers", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", {
      getRandomValues: (array: Uint32Array) => {
        array[0] = 7;
        return array;
      },
      randomUUID: () => "result-id",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("starts a spin and schedules the alarm", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
    const wheelData = buildWheelData({
      entries: [
        { id: "a", name: "Alpha", enabled: true },
        { id: "b", name: "Beta", enabled: true },
        { id: "c", name: "Gamma", enabled: true },
      ],
    });
    const wheel = createWheel(wheelData);

    await handleSpin(wheel, "mod");

    const spinState = (
      wheel.repository.setSpinState as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0][0];

    expect(spinState).toEqual(
      expect.objectContaining({
        isSpinning: true,
        startedAt: 1000,
        duration: wheelData.settings.spinDurationMs,
        targetIndex: 1,
      }),
    );
    expect(wheel.broadcast).toHaveBeenCalledWith({
      type: "spinStarted",
      spinState,
    });
    expect(wheel.state.storage.setAlarm).toHaveBeenCalledWith(
      1000 + wheelData.settings.spinDurationMs,
    );
  });

  it("rejects spins while already spinning", async () => {
    const wheelData = buildWheelData({
      spinState: {
        isSpinning: true,
        startedAt: Date.now(),
        targetIndex: 0,
        duration: 2000,
      },
    });
    const wheel = createWheel(wheelData);

    await expect(handleSpin(wheel, "mod")).rejects.toThrow(
      "Wheel is already spinning",
    );
  });

  it("rejects spins with fewer than two enabled entries", async () => {
    const wheelData = buildWheelData({
      entries: [
        { id: "a", name: "Alpha", enabled: true },
        { id: "b", name: "Beta", enabled: false },
      ],
    });
    const wheel = createWheel(wheelData);

    await expect(handleSpin(wheel, "mod")).rejects.toThrow(
      "Need at least 2 entries to spin",
    );
  });

  it("completes a spin and removes the winner when configured", async () => {
    const wheelData = buildWheelData({
      entries: [
        { id: "a", name: "Alpha", enabled: true },
        { id: "b", name: "Beta", enabled: true },
      ],
      spinState: {
        isSpinning: true,
        startedAt: 1,
        targetIndex: 1,
        duration: 2000,
      },
      settings: {
        removeWinnerAfterSpin: true,
        showConfetti: false,
        playSounds: false,
        spinDurationMs: 2000,
      },
    });
    const entriesAfter = [{ id: "a", name: "Alpha", enabled: true }];
    const wheel = createWheel(wheelData, entriesAfter);

    await handleSpinComplete(wheel);

    expect(wheel.repository.addResult).toHaveBeenCalledWith(
      expect.objectContaining({
        winner: "Beta",
        removedAfter: true,
      }),
    );
    expect(wheel.repository.removeEntry).toHaveBeenCalledWith("b");
    expect(wheel.repository.setSpinState).toHaveBeenCalledWith(null);
    expect(wheel.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "spinEnded",
        entries: entriesAfter,
      }),
    );
  });

  it("clears spin state when the target index is invalid", async () => {
    const wheelData = buildWheelData({
      entries: [{ id: "a", name: "Alpha", enabled: true }],
      spinState: {
        isSpinning: true,
        startedAt: 1,
        targetIndex: 2,
        duration: 2000,
      },
    });
    const wheel = createWheel(wheelData);

    await handleSpinComplete(wheel);

    expect(wheel.repository.setSpinState).toHaveBeenCalledWith(null);
    expect(wheel.repository.addResult).not.toHaveBeenCalled();
  });
});

describe("wheel reset and settings handlers", () => {
  it("rejects reset while spinning", async () => {
    const wheelData = buildWheelData({
      spinState: {
        isSpinning: true,
        startedAt: 1,
        targetIndex: 0,
        duration: 2000,
      },
    });
    const wheel = createWheel(wheelData);

    await expect(handleResetWheel(wheel, "mod")).rejects.toThrow(
      "Cannot reset while spinning",
    );
  });

  it("resets wheel data and broadcasts", async () => {
    const wheelData = buildWheelData();
    const wheel = createWheel(wheelData);

    await handleResetWheel(wheel, "mod");

    expect(wheel.repository.clearResults).toHaveBeenCalled();
    expect(wheel.repository.clearEntries).toHaveBeenCalled();
    expect(wheel.repository.setSpinState).toHaveBeenCalledWith(null);
    expect(wheel.broadcast).toHaveBeenCalledWith({
      type: "wheelReset",
      entries: [],
      results: [],
    });
  });

  it("clamps spin duration when updating settings", async () => {
    const wheelData = buildWheelData({
      settings: {
        removeWinnerAfterSpin: false,
        showConfetti: false,
        playSounds: false,
        spinDurationMs: 4000,
      },
    });
    const wheel = createWheel(wheelData);

    await handleUpdateSettings(wheel, "mod", { spinDurationMs: 1500 });

    expect(wheel.repository.setSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        spinDurationMs: 2000,
      }),
    );
    expect(wheel.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "settingsUpdated",
      }),
    );
  });
});
