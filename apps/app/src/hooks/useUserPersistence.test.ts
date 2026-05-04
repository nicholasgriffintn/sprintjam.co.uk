/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";

const storage = new Map<string, string>();

vi.mock("@/utils/storage", () => ({
  safeLocalStorage: {
    get: (key: string) => storage.get(key) ?? null,
    set: (key: string, value: string) => storage.set(key, value),
    remove: (key: string) => storage.delete(key),
  },
}));

import {
  getStoredUserAvatar,
  getStoredUserName,
  useUserPersistence,
} from "@/hooks/useUserPersistence";

describe("useUserPersistence", () => {
  beforeEach(() => {
    storage.clear();
    cleanup();
  });

  it("stores avatar immediately when one is selected", () => {
    renderHook(() =>
      useUserPersistence({
        name: "",
        avatar: "robot",
      }),
    );

    expect(storage.get("sprintjam_avatar")).toBe("robot");
  });

  it("removes stored avatar when avatar is cleared", () => {
    storage.set("sprintjam_avatar", "robot");

    renderHook(() =>
      useUserPersistence({
        name: "",
        avatar: null,
      }),
    );

    expect(storage.get("sprintjam_avatar")).toBeUndefined();
  });

  it("reads stored name and trims empty avatar values", () => {
    storage.set("sprintjam_username", "Alice");
    storage.set("sprintjam_avatar", "   ");

    expect(getStoredUserName()).toBe("Alice");
    expect(getStoredUserAvatar()).toBeNull();
  });
});
