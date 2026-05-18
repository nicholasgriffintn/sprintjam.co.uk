import { describe, expect, it } from "vitest";

import {
  RETRO_TEMPLATES,
  getRetroTemplate,
  normaliseRetroSettings,
} from "./retro-templates";

describe("retro templates", () => {
  it("keeps template ids unique", () => {
    const ids = RETRO_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("falls back to the default template for unknown ids", () => {
    expect(getRetroTemplate("missing").id).toBe("start-stop-continue");
  });

  it("normalises bounded room settings", () => {
    expect(
      normaliseRetroSettings(null, {
        templateId: "sailboat",
        votesPerParticipant: 30,
        timerMinutes: 0,
        anonymousCards: true,
        hideCardsDuringInput: false,
      }),
    ).toMatchObject({
      templateId: "sailboat",
      votesPerParticipant: 10,
      timerMinutes: 1,
      anonymousCards: true,
      hideCardsDuringInput: false,
    });
  });
});
