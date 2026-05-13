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
        JSON.stringify({ type: "setPhase", phase: "focus" }),
      ),
    ).toEqual({
      ok: true,
      message: { type: "setPhase", phase: "focus" },
    });

    expect(
      validateRetroMessagePayload(
        JSON.stringify({ type: "addAction", title: "Write the rollout note" }),
      ),
    ).toEqual({
      ok: true,
      message: {
        type: "addAction",
        title: "Write the rollout note",
      },
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
  });
});
