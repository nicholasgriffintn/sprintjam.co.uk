import { describe, expect, it } from "vitest";
import { DEFAULT_RETRO_SETTINGS, type RetroData } from "@sprintjam/types";
import { getRetroTemplate } from "@sprintjam/utils";

import { buildRetroRecapCsv, buildRetroRecapText } from "@/utils/retro-recap";

const retro: RetroData = {
  key: "RETRO1",
  template: getRetroTemplate(DEFAULT_RETRO_SETTINGS.templateId),
  settings: DEFAULT_RETRO_SETTINGS,
  moderator: "Ava",
  users: ["Ava", "Mo"],
  connectedUsers: { Ava: true, Mo: true },
  phase: "completed",
  phaseStartedAt: 1,
  status: "completed",
  cards: [
    {
      id: "card-1",
      columnId: "start",
      text: "Pair on release checklist",
      author: "Mo",
      owner: "Mo",
      groupId: "group-1",
      groupTitle: "Release quality",
      createdAt: 1,
      votes: ["Ava", "Mo"],
    },
  ],
  actionItems: [
    {
      id: "action-1",
      title: "Publish the checklist",
      owner: "Ava",
      dueAt: 1_700_000_000_000,
      priority: "high",
      createdAt: 1,
      completed: false,
    },
  ],
  readyUsers: [],
  createdAt: 1,
};

describe("retro recap utilities", () => {
  it("builds a text recap with grouped cards and action metadata", () => {
    expect(buildRetroRecapText(retro)).toContain(
      "- Pair on release checklist [Group: Release quality] (2 votes)",
    );
    expect(buildRetroRecapText(retro)).toContain(
      "- Publish the checklist (Open; Owner: Ava; Priority: high;",
    );
  });

  it("builds a csv recap for cards and actions", () => {
    expect(buildRetroRecapCsv(retro)).toContain(
      '"card","Start","Pair on release checklist","Mo","","","","2","Release quality"',
    );
    expect(buildRetroRecapCsv(retro)).toContain(
      '"action","","Publish the checklist","Ava","high","2023-11-14","open","",""',
    );
  });
});
