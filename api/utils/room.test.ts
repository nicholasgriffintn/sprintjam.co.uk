import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateRoomKey, getRoomId, getRoomStub } from "./room";

describe("room utils", () => {
  const originalCrypto = (globalThis as any).crypto;
  const mockGetRandomValues = vi.fn((array: Uint8Array) => {
    array.set([15, 31, 7, 255]);
    return array;
  });

  beforeEach(() => {
    Object.defineProperty(globalThis, "crypto", {
      value: { getRandomValues: mockGetRandomValues } as unknown as Crypto,
      configurable: true,
    });
    mockGetRandomValues.mockClear();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "crypto", {
      value: originalCrypto,
      configurable: true,
    });
  });

  it("generates an uppercase six character room key", () => {
    expect(generateRoomKey()).toBe("0F0V07");
    expect(mockGetRandomValues).toHaveBeenCalledOnce();
  });

  it("returns a normalized room id", () => {
    expect(getRoomId("AbC123")).toBe("room-abc123");
  });

  it("retrieves a room stub from the environment", () => {
    const getSpy = vi.fn();
    const idFromName = vi.fn().mockReturnValue("do-id");
    const env = {
      PLANNING_ROOM: {
        idFromName,
        get: getSpy,
      },
    } as any;

    const stub = getRoomStub(env, "ABC123");
    expect(idFromName).toHaveBeenCalledWith("room-abc123");
    expect(getSpy).toHaveBeenCalledWith("do-id");
    expect(stub).toBe(getSpy.mock.results[0].value);
  });
});
