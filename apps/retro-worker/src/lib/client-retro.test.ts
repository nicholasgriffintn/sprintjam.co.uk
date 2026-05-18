import { describe, expect, it } from "vitest";
import { DEFAULT_RETRO_SETTINGS, type RetroStateData } from "@sprintjam/types";
import { getRetroTemplate } from "@sprintjam/utils";

import { toClientRetroData } from "./client-retro";

const baseRetro: RetroStateData = {
  key: "RETRO1",
  template: getRetroTemplate(DEFAULT_RETRO_SETTINGS.templateId),
  settings: DEFAULT_RETRO_SETTINGS,
  moderator: "Alice",
  users: ["Alice", "Bob"],
  connectedUsers: { Alice: true, Bob: true },
  phase: "input",
  phaseStartedAt: 1,
  status: "active",
  cards: [
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
      text: "Late deploys",
      owner: "Bob",
      author: "Bob",
      createdAt: 2,
      votes: [],
    },
  ],
  actionItems: [],
  readyUsers: [],
  createdAt: 1,
  passcodeHash: { salt: "salt", hash: "hash", iterations: 1 },
  sessionTokens: { Alice: { token: "token", createdAt: 1 } },
  workspaceUserIds: { Alice: 1 },
};

describe("toClientRetroData", () => {
  it("redacts other participants' input cards for the viewer", () => {
    const clientData = toClientRetroData(baseRetro, "Alice");

    expect(clientData.cards[0]).toMatchObject({
      id: "card-1",
      text: "Keep pairing",
      owner: "Alice",
      author: "Alice",
    });
    expect(clientData.cards[1]).toMatchObject({
      id: "card-2",
      text: "",
      author: "",
      owner: undefined,
    });
    expect(JSON.stringify(clientData)).not.toContain("Late deploys");
    expect(JSON.stringify(clientData)).not.toContain("sessionTokens");
  });

  it("keeps input cards visible when the setting is disabled", () => {
    const clientData = toClientRetroData(
      {
        ...baseRetro,
        settings: { ...baseRetro.settings, hideCardsDuringInput: false },
      },
      "Alice",
    );

    expect(clientData.cards[1]?.text).toBe("Late deploys");
  });

  it("keeps cards visible after input ends", () => {
    const clientData = toClientRetroData(
      { ...baseRetro, phase: "review" },
      "Alice",
    );

    expect(clientData.cards[1]?.text).toBe("Late deploys");
  });
});
