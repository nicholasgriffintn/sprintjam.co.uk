// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_RETRO_SETTINGS, type RetroData } from "@sprintjam/types";
import { getRetroTemplate } from "@sprintjam/utils";

import { RetroBoard } from "./RetroBoard";

const noop = vi.fn();

function buildRetro(cards: RetroData["cards"]): RetroData {
  const template = getRetroTemplate(DEFAULT_RETRO_SETTINGS.templateId);
  return {
    key: "RETRO1",
    template,
    settings: DEFAULT_RETRO_SETTINGS,
    moderator: "Alice",
    users: ["Alice", "Bob"],
    connectedUsers: { Alice: true, Bob: true },
    phase: "input",
    phaseStartedAt: 1,
    status: "active",
    cards,
    actionItems: [],
    readyUsers: [],
    createdAt: 1,
  };
}

function renderBoard(retro: RetroData) {
  return render(
    <RetroBoard
      retro={retro}
      userName="Alice"
      isModerator={false}
      drafts={{}}
      cardSort="newest"
      cardFilter="all"
      editingCard={null}
      onCardSortChange={noop}
      onCardFilterChange={noop}
      onDraftChange={noop}
      onAddCard={noop}
      onEditCardDraftChange={noop}
      onSaveCardEdit={noop}
      onCancelCardEdit={noop}
      onVoteCard={noop}
      onMoveCard={noop}
      onGroupCards={noop}
      onStartCardEdit={noop}
      onUngroupCard={noop}
      onDeleteCard={noop}
    />,
  );
}

describe("RetroBoard", () => {
  it("renders a hidden placeholder without response text for redacted input cards", () => {
    renderBoard(
      buildRetro([
        {
          id: "card-1",
          columnId: "start",
          text: "Keep pairing",
          owner: "Alice",
          author: "Alice",
          createdAt: 1,
          votes: [],
        },
        {
          id: "card-2",
          columnId: "stop",
          text: "",
          author: "",
          createdAt: 2,
          votes: [],
        },
      ]),
    );

    expect(screen.getByText("Keep pairing")).toBeTruthy();
    expect(screen.queryByText("Late deploys")).toBeNull();
    expect(screen.getByTestId("retro-card-hidden-content")).toBeTruthy();
  });

  it("renders received card text when input privacy is disabled", () => {
    renderBoard({
      ...buildRetro([
        {
          id: "card-1",
          columnId: "start",
          text: "Late deploys",
          owner: "Bob",
          author: "Bob",
          createdAt: 1,
          votes: [],
        },
      ]),
      settings: { ...DEFAULT_RETRO_SETTINGS, hideCardsDuringInput: false },
    });

    const card = screen.getByTestId("retro-card");
    expect(within(card).getByText("Late deploys")).toBeTruthy();
    expect(screen.queryByTestId("retro-card-hidden-content")).toBeNull();
  });
});
