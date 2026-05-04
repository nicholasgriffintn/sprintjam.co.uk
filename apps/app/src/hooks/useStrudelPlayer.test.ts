/**
 * @vitest-environment jsdom
 */
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

type MockStrudelRuntime = {
  evaluate: ReturnType<typeof vi.fn>;
  hush: ReturnType<typeof vi.fn>;
  initStrudel: ReturnType<typeof vi.fn>;
  setDefaultValue: ReturnType<typeof vi.fn>;
};

const renderStrudelPlayer = async (
  runtimeOverrides: Partial<MockStrudelRuntime> = {},
) => {
  vi.resetModules();

  const runtime: MockStrudelRuntime = {
    evaluate: vi.fn(async () => ({})),
    hush: vi.fn(),
    initStrudel: vi.fn(async () => undefined),
    setDefaultValue: vi.fn(),
    ...runtimeOverrides,
  };

  vi.doMock("@/lib/strudel", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/strudel")>();

    return {
      ...actual,
      loadStrudelRuntime: vi.fn(async () => runtime),
      prebake: vi.fn(async () => undefined),
    };
  });

  const { STRUDEL_LOG_EVENT_KEY } = await import("@/lib/strudel");
  const { useStrudelPlayer } = await import("@/hooks/useStrudelPlayer");
  const onError = vi.fn();
  const hook = renderHook(() => useStrudelPlayer({ onError }));

  return {
    ...hook,
    runtime,
    onError,
    STRUDEL_LOG_EVENT_KEY,
  };
};

describe("useStrudelPlayer", () => {
  afterEach(() => {
    cleanup();
    vi.doUnmock("@/lib/strudel");
    vi.restoreAllMocks();
  });

  it("stops playback after Strudel reports a trigger-time error", async () => {
    const { result, runtime, onError, STRUDEL_LOG_EVENT_KEY } =
      await renderStrudelPlayer();

    await act(async () => {
      await result.current.playCode('s("bd")');
    });

    expect(result.current.isPlaying).toBe(true);

    act(() => {
      document.dispatchEvent(
        new CustomEvent(STRUDEL_LOG_EVENT_KEY, {
          detail: {
            message:
              "[getTrigger] error: sound rhodes not found! Is it loaded?",
          },
        }),
      );
    });

    await waitFor(() => expect(result.current.isPlaying).toBe(false));
    expect(runtime.hush).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledWith(
      new Error(
        "Strudel playback stopped: sound rhodes not found! Is it loaded?",
      ),
    );
  });

  it("does not mark playback as running when evaluation logs an error", async () => {
    const evaluate = vi.fn(async () => {
      document.dispatchEvent(
        new CustomEvent("strudel.log", {
          detail: {
            message: "[eval] error: Unexpected token",
            type: "error",
          },
        }),
      );
      return undefined;
    });

    const { result, onError } = await renderStrudelPlayer({ evaluate });

    await act(async () => {
      await result.current.playCode("not valid strudel");
    });

    expect(result.current.isPlaying).toBe(false);
    expect(onError).toHaveBeenCalledWith(
      new Error("Strudel playback stopped: Unexpected token"),
    );
  });
});
