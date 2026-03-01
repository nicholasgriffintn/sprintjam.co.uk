/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { getServerDefaults } from "@sprintjam/utils";
import type { ServerDefaults } from "@/types";

let cachedDefaults: ServerDefaults | null = null;
let collectionDefaults: ServerDefaults | null = null;

const writeUpsertMock = vi.fn();
const ensureReadyMock = vi.fn().mockResolvedValue(undefined);
const fetchDefaultSettingsMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/api-service", () => ({
  getCachedDefaultSettings: () => cachedDefaults,
  fetchDefaultSettings: (...args: unknown[]) =>
    fetchDefaultSettingsMock(...args),
}));

vi.mock("@/lib/data/collections", () => ({
  serverDefaultsCollection: {
    isReady: () => true,
    utils: {
      writeUpsert: (...args: unknown[]) => writeUpsertMock(...args),
    },
  },
  ensureServerDefaultsCollectionReady: (...args: unknown[]) =>
    ensureReadyMock(...args),
}));

vi.mock("@/lib/data/hooks", () => ({
  useServerDefaults: () => collectionDefaults,
}));

import { useServerDefaults } from "@/hooks/useServerDefaults";

describe("useServerDefaults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    cachedDefaults = null;
    collectionDefaults = null;
  });

  it("keeps applied defaults when collection snapshot temporarily becomes null", () => {
    const initialDefaults = getServerDefaults();
    const appliedDefaults = {
      ...getServerDefaults(),
      roomSettings: {
        ...initialDefaults.roomSettings,
        alwaysRevealVotes: !initialDefaults.roomSettings.alwaysRevealVotes,
      },
    };

    cachedDefaults = initialDefaults;
    collectionDefaults = initialDefaults;

    const { result, rerender } = renderHook(() => useServerDefaults());

    expect(result.current.serverDefaults).toEqual(initialDefaults);

    act(() => {
      result.current.applyServerDefaults(appliedDefaults);
    });

    expect(result.current.serverDefaults).toEqual(appliedDefaults);

    collectionDefaults = null;
    rerender();

    expect(result.current.serverDefaults).toEqual(appliedDefaults);
    expect(writeUpsertMock).toHaveBeenCalledWith(appliedDefaults);
  });
});
