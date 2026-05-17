import { describe, expect, it } from "vitest";

import { validateRetroMessagePayload } from "./retro-validation";

describe("validateRetroMessagePayload", () => {
  it("accepts valid card, vote, phase, and action messages", () => {
    expect(
      validateRetroMessagePayload(
        JSON.stringify({
          type: "addCard",
          columnId: "start",
          text: "Keep demos smaller",
        }),
      ),
    ).toEqual({
      ok: true,
      message: {
        type: "addCard",
        columnId: "start",
        text: "Keep demos smaller",
      },
    });

    expect(
      validateRetroMessagePayload(
        JSON.stringify({ type: "voteCard", cardId: "card-1" }),
      ),
    ).toEqual({
      ok: true,
      message: { type: "voteCard", cardId: "card-1" },
    });

    expect(
      validateRetroMessagePayload(
        JSON.stringify({
          type: "updateCard",
          cardId: "card-1",
          text: "Keep demos smaller",
        }),
      ),
    ).toEqual({
      ok: true,
      message: {
        type: "updateCard",
        cardId: "card-1",
        text: "Keep demos smaller",
      },
    });

    expect(
      validateRetroMessagePayload(
        JSON.stringify({
          type: "moveCard",
          cardId: "card-1",
          columnId: "continue",
        }),
      ),
    ).toEqual({
      ok: true,
      message: {
        type: "moveCard",
        cardId: "card-1",
        columnId: "continue",
      },
    });

    expect(
      validateRetroMessagePayload(
        JSON.stringify({
          type: "groupCards",
          cardIds: ["card-1", "card-2", "card-1"],
          title: "Release quality",
        }),
      ),
    ).toEqual({
      ok: true,
      message: {
        type: "groupCards",
        cardIds: ["card-1", "card-2"],
        title: "Release quality",
      },
    });

    expect(
      validateRetroMessagePayload(
        JSON.stringify({ type: "setPhase", phase: "focus" }),
      ),
    ).toEqual({
      ok: true,
      message: { type: "setPhase", phase: "focus" },
    });

    expect(
      validateRetroMessagePayload(
        JSON.stringify({
          type: "addAction",
          title: "Write the rollout note",
          owner: "Ava",
          dueAt: 1_700_000_000_000,
          priority: "high",
        }),
      ),
    ).toEqual({
      ok: true,
      message: {
        type: "addAction",
        title: "Write the rollout note",
        owner: "Ava",
        dueAt: 1_700_000_000_000,
        priority: "high",
      },
    });

    expect(
      validateRetroMessagePayload(
        JSON.stringify({
          type: "updateAction",
          actionId: "action-1",
          owner: null,
          dueAt: null,
          priority: "low",
        }),
      ),
    ).toEqual({
      ok: true,
      message: {
        type: "updateAction",
        actionId: "action-1",
        owner: null,
        dueAt: null,
        priority: "low",
      },
    });

    expect(
      validateRetroMessagePayload(
        JSON.stringify({
          type: "configureTimer",
          config: { targetDurationSeconds: 300, resetCountdown: true },
        }),
      ),
    ).toEqual({
      ok: true,
      message: {
        type: "configureTimer",
        config: { targetDurationSeconds: 300, resetCountdown: true },
      },
    });

    expect(
      validateRetroMessagePayload(
        JSON.stringify({ type: "extendTimer", seconds: 300 }),
      ),
    ).toEqual({
      ok: true,
      message: { type: "extendTimer", seconds: 300 },
    });
  });

  it("rejects malformed messages", () => {
    expect(validateRetroMessagePayload("{bad")).toEqual({
      ok: false,
      error: "Invalid JSON",
    });
    expect(
      validateRetroMessagePayload(
        JSON.stringify({ type: "setPhase", phase: "unsupported" }),
      ),
    ).toEqual({
      ok: false,
      error: "Invalid retro phase",
    });
    expect(
      validateRetroMessagePayload(
        JSON.stringify({ type: "addCard", columnId: "start", text: "" }),
      ),
    ).toEqual({
      ok: false,
      error: "Card column and text are required",
    });
    expect(
      validateRetroMessagePayload(
        JSON.stringify({ type: "configureTimer", config: null }),
      ),
    ).toEqual({
      ok: false,
      error: "Timer config is required",
    });
    expect(
      validateRetroMessagePayload(
        JSON.stringify({
          type: "groupCards",
          cardIds: ["card-1"],
          title: "Too small",
        }),
      ),
    ).toEqual({
      ok: false,
      error: "Group title and at least two cards are required",
    });
  });
});
