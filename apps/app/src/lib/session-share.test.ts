import { describe, expect, it } from "vitest";

import { getSessionSharePath, getSessionShareUrl } from "@/lib/session-share";

describe("session share helpers", () => {
  it("maps each session type to its joinable share path", () => {
    expect(getSessionSharePath("room", "ABC123")).toBe("/room/ABC123");
    expect(getSessionSharePath("wheel", "WHEEL1")).toBe("/wheel/WHEEL1");
    expect(getSessionSharePath("standup", "STAND1")).toBe(
      "/standup/join/STAND1",
    );
    expect(getSessionSharePath("retro", "RETRO1")).toBe("/retro/join/RETRO1");
  });

  it("builds absolute share urls from a supplied origin", () => {
    expect(
      getSessionShareUrl("standup", "STAND1", "https://sprintjam.co.uk"),
    ).toBe("https://sprintjam.co.uk/standup/join/STAND1");
  });
});
