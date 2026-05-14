import { describe, expect, it } from "vitest";
import type { RetroCard } from "@sprintjam/types";

import { canDeleteRetroCard, canSetRetroPhase } from "./retro-permissions";

const buildCard = (overrides: Partial<RetroCard> = {}): RetroCard => ({
  id: "card-1",
  columnId: "start",
  text: "Improve review flow",
  author: "Alice",
  createdAt: 1,
  votes: [],
  ...overrides,
});

describe("retro permissions", () => {
  it("allows moderators to delete any card", () => {
    expect(
      canDeleteRetroCard({
        card: buildCard({ author: "" }),
        moderator: "Moderator",
        userName: "Moderator",
      }),
    ).toBe(true);
  });

  it("allows the stored owner to delete an anonymous card", () => {
    expect(
      canDeleteRetroCard({
        card: buildCard({ author: "", owner: "Alice" }),
        moderator: "Moderator",
        userName: "Alice",
      }),
    ).toBe(true);
  });

  it("blocks other participants from deleting anonymous cards", () => {
    expect(
      canDeleteRetroCard({
        card: buildCard({ author: "" }),
        moderator: "Moderator",
        userName: "Bob",
      }),
    ).toBe(false);
  });

  it("does not allow phase-only updates to complete retros", () => {
    expect(canSetRetroPhase("completed")).toBe(false);
    expect(canSetRetroPhase("focus")).toBe(true);
  });
});
