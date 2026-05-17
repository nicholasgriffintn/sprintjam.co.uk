// @vitest-environment jsdom
import type { RetroCard } from "@sprintjam/types";
import { describe, expect, it } from "vitest";

import {
  getRetroBoardDropTargetFromElement,
  getRetroBoardDropTargetKey,
  resolveRetroBoardDrop,
} from "./retro-board-dnd";

const baseCards: RetroCard[] = [
  buildCard({ id: "card-1", columnId: "start", text: "Improve handover" }),
  buildCard({ id: "card-2", columnId: "continue", text: "Pair on deploys" }),
  buildCard({
    id: "card-3",
    columnId: "start",
    text: "Keep release notes visible",
    groupId: "group-1",
    groupTitle: "Release readiness",
  }),
  buildCard({
    id: "card-4",
    columnId: "start",
    text: "Share rollout checklist",
    groupId: "group-1",
    groupTitle: "Release readiness",
  }),
];

describe("retro board drag and drop", () => {
  it("resolves drop target metadata from the closest retro element", () => {
    const column = document.createElement("div");
    column.dataset.retroColumnId = "start";
    const group = document.createElement("section");
    group.dataset.retroGroupId = "group-1";
    const card = document.createElement("article");
    card.dataset.retroCardId = "card-1";
    const handle = document.createElement("button");

    card.appendChild(handle);
    group.appendChild(card);
    column.appendChild(group);

    expect(getRetroBoardDropTargetFromElement(handle)).toEqual({
      type: "card",
      cardId: "card-1",
    });
    expect(getRetroBoardDropTargetFromElement(group)).toEqual({
      type: "group",
      groupId: "group-1",
    });
    expect(getRetroBoardDropTargetFromElement(column)).toEqual({
      type: "column",
      columnId: "start",
    });
  });

  it("builds stable drop target keys", () => {
    expect(
      getRetroBoardDropTargetKey({ type: "column", columnId: "start" }),
    ).toBe("column:start");
    expect(
      getRetroBoardDropTargetKey({ type: "group", groupId: "group-1" }),
    ).toBe("group:group-1");
    expect(getRetroBoardDropTargetKey({ type: "card", cardId: "card-1" })).toBe(
      "card:card-1",
    );
  });

  it("moves a dragged card to a dropped column", () => {
    expect(
      resolveRetroBoardDrop({
        cards: baseCards,
        payload: { type: "card", cardId: "card-2" },
        target: { type: "column", columnId: "start" },
      }),
    ).toEqual({
      type: "moveCards",
      cardIds: ["card-2"],
      columnId: "start",
    });
  });

  it("ungroups a dragged grouped card when dropped on a column", () => {
    expect(
      resolveRetroBoardDrop({
        cards: [
          ...baseCards,
          buildCard({
            id: "card-5",
            columnId: "start",
            text: "Confirm rollout owner",
            groupId: "group-1",
            groupTitle: "Release readiness",
          }),
        ],
        payload: { type: "card", cardId: "card-3" },
        target: { type: "column", columnId: "continue" },
      }),
    ).toEqual({
      type: "moveCards",
      cardIds: ["card-3"],
      columnId: "continue",
      ungroupCardIds: ["card-3"],
    });
  });

  it("dissolves the old group when a dragged card would leave one card behind", () => {
    expect(
      resolveRetroBoardDrop({
        cards: baseCards,
        payload: { type: "card", cardId: "card-3" },
        target: { type: "column", columnId: "stop" },
      }),
    ).toEqual({
      type: "moveCards",
      cardIds: ["card-3"],
      columnId: "stop",
      ungroupCardIds: ["card-3", "card-4"],
    });
  });

  it("moves a dragged group together when dropped on a column", () => {
    expect(
      resolveRetroBoardDrop({
        cards: baseCards,
        payload: { type: "group", groupId: "group-1" },
        target: { type: "column", columnId: "continue" },
      }),
    ).toEqual({
      type: "moveCards",
      cardIds: ["card-3", "card-4"],
      columnId: "continue",
    });
  });

  it("groups a dragged card with a target card", () => {
    expect(
      resolveRetroBoardDrop({
        cards: baseCards,
        payload: { type: "card", cardId: "card-2" },
        target: { type: "card", cardId: "card-1" },
      }),
    ).toEqual({
      type: "groupCards",
      cardIds: ["card-2", "card-1"],
      columnId: "start",
      title: "Improve handover",
    });
  });

  it("adds a dragged card to the target group", () => {
    expect(
      resolveRetroBoardDrop({
        cards: baseCards,
        payload: { type: "card", cardId: "card-2" },
        target: { type: "group", groupId: "group-1" },
      }),
    ).toEqual({
      type: "groupCards",
      cardIds: ["card-2", "card-3", "card-4"],
      columnId: "start",
      title: "Release readiness",
    });
  });

  it("dissolves the old source group when a grouped card joins another group", () => {
    expect(
      resolveRetroBoardDrop({
        cards: [
          ...baseCards,
          buildCard({
            id: "card-5",
            columnId: "continue",
            text: "Keep demo script short",
            groupId: "group-2",
            groupTitle: "Demo readiness",
          }),
          buildCard({
            id: "card-6",
            columnId: "continue",
            text: "Confirm demo owner",
            groupId: "group-2",
            groupTitle: "Demo readiness",
          }),
        ],
        payload: { type: "card", cardId: "card-3" },
        target: { type: "group", groupId: "group-2" },
      }),
    ).toEqual({
      type: "groupCards",
      cardIds: ["card-3", "card-5", "card-6"],
      columnId: "continue",
      title: "Demo readiness",
      ungroupCardIds: ["card-4"],
    });
  });

  it("does not regroup a card that is dropped back onto its own group", () => {
    expect(
      resolveRetroBoardDrop({
        cards: baseCards,
        payload: { type: "card", cardId: "card-3" },
        target: { type: "group", groupId: "group-1" },
      }),
    ).toEqual({ type: "none" });
  });
});

function buildCard(
  card: Partial<RetroCard> & Pick<RetroCard, "id">,
): RetroCard {
  return {
    columnId: "start",
    text: "Card",
    author: "Tester",
    createdAt: 1,
    votes: [],
    ...card,
  };
}
