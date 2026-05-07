// @vitest-environment jsdom
import { act, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WheelData, WheelServerMessage } from "@sprintjam/types";

import { WheelProvider, useWheelActions } from "./WheelContext";
import { connectToWheel } from "@/lib/wheel-api-service";
import {
  recordWheelOutcomeByRoomKey,
  recordWheelSessionStats,
} from "@/lib/workspace-service";

const workspaceDataMock = vi.hoisted(() => ({
  isAuthenticated: false,
}));

vi.mock("@/hooks/useWorkspaceData", () => ({
  useWorkspaceData: () => workspaceDataMock,
}));

vi.mock("@/lib/wheel-api-service", () => ({
  addEntry: vi.fn(),
  bulkAddEntries: vi.fn(),
  clearEntries: vi.fn(),
  connectToWheel: vi.fn(),
  disconnectFromWheel: vi.fn(),
  getCachedWheel: vi.fn(() => null),
  removeEntry: vi.fn(),
  resetWheel: vi.fn(),
  spin: vi.fn(),
  toggleEntry: vi.fn(),
  updateEntry: vi.fn(),
  updateWheelSettings: vi.fn(),
}));

vi.mock("@/lib/workspace-service", () => ({
  recordWheelOutcomeByRoomKey: vi.fn(),
  recordWheelSessionStats: vi.fn(),
}));

function makeWheel(): WheelData {
  return {
    key: "5Z461Q",
    entries: [
      { id: "one", name: "Ada", enabled: true },
      { id: "two", name: "Grace", enabled: true },
    ],
    users: ["Ada"],
    connectedUsers: { Ada: true },
    moderator: "Ada",
    spinState: null,
    results: [],
    settings: {
      mode: "decision",
      removeWinnerAfterSpin: false,
      showConfetti: true,
      playSounds: false,
      spinDurationMs: 4000,
    },
    status: "active",
  };
}

function ConnectWheel() {
  const { connectWheel } = useWheelActions();

  useEffect(() => {
    connectWheel("5Z461Q", "Ada");
  }, [connectWheel]);

  return null;
}

async function renderConnectedWheel() {
  let onMessage: ((message: WheelServerMessage) => void) | null = null;
  vi.mocked(connectToWheel).mockImplementation(
    (_wheelKey, _userName, messageHandler) => {
      onMessage = messageHandler;
      return {} as WebSocket;
    },
  );

  render(
    <WheelProvider userName="Ada">
      <ConnectWheel />
    </WheelProvider>,
  );

  await waitFor(() => expect(onMessage).not.toBeNull());
  await act(async () => {
    onMessage?.({ type: "initialize", wheel: makeWheel() });
  });

  return {
    spinEnded: async () => {
      await act(async () => {
        onMessage?.({
          type: "spinEnded",
          entries: makeWheel().entries,
          result: {
            id: "result-1",
            winner: "Ada",
            removedAfter: false,
            timestamp: Date.now(),
          },
        });
      });
    },
  };
}

describe("WheelProvider workspace recording", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workspaceDataMock.isAuthenticated = false;
    vi.mocked(recordWheelSessionStats).mockResolvedValue(undefined);
    vi.mocked(recordWheelOutcomeByRoomKey).mockResolvedValue({} as never);
  });

  it("records anonymous wheel stats without workspace outcome writes", async () => {
    const wheel = await renderConnectedWheel();

    await wheel.spinEnded();

    await waitFor(() => {
      expect(recordWheelSessionStats).toHaveBeenCalledTimes(1);
    });
    expect(recordWheelOutcomeByRoomKey).not.toHaveBeenCalled();
  });

  it("records workspace outcomes for authenticated users", async () => {
    workspaceDataMock.isAuthenticated = true;
    const wheel = await renderConnectedWheel();

    await wheel.spinEnded();

    await waitFor(() => {
      expect(recordWheelOutcomeByRoomKey).toHaveBeenCalledWith(
        "5Z461Q",
        "decision",
        expect.objectContaining({ winner: "Ada" }),
      );
    });
    expect(recordWheelSessionStats).toHaveBeenCalledTimes(1);
  });
});
