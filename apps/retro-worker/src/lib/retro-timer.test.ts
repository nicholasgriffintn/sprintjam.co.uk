import { describe, expect, it, vi } from "vitest";
import type { RetroStateData } from "@sprintjam/types";
import { DEFAULT_RETRO_SETTINGS } from "@sprintjam/types";
import { getRetroTemplate } from "@sprintjam/utils";

import {
  configureRetroTimer,
  ensureRetroTimerState,
  extendRetroTimer,
  pauseRetroTimer,
  resetRetroTimer,
  startRetroTimer,
} from "./retro-timer";

const buildRetro = (
  overrides: Partial<RetroStateData> = {},
): RetroStateData => ({
  key: "retro-1",
  template: getRetroTemplate(DEFAULT_RETRO_SETTINGS.templateId),
  settings: DEFAULT_RETRO_SETTINGS,
  moderator: "Alice",
  users: ["Alice"],
  connectedUsers: { Alice: true },
  phase: "input",
  phaseStartedAt: 1000,
  status: "active",
  cards: [],
  actionItems: [],
  readyUsers: [],
  createdAt: 1000,
  ...overrides,
});

describe("retro timer", () => {
  it("creates a running timer from retro settings", () => {
    const retro = buildRetro();

    expect(ensureRetroTimerState(retro, 1000)).toEqual({
      running: true,
      seconds: 0,
      lastUpdateTime: 1000,
      targetDurationSeconds: 600,
      roundAnchorSeconds: 0,
      autoResetOnVotesReset: false,
    });
  });

  it("pauses with elapsed seconds and can restart", () => {
    const retro = buildRetro();
    resetRetroTimer(retro, 1000, true);

    pauseRetroTimer(retro, 3500);
    expect(retro.timerState?.running).toBe(false);
    expect(retro.timerState?.seconds).toBe(2);

    startRetroTimer(retro, 5000);
    expect(retro.timerState?.running).toBe(true);
    expect(retro.timerState?.lastUpdateTime).toBe(5000);
  });

  it("resets the countdown when configuring a new duration", () => {
    const retro = buildRetro();
    resetRetroTimer(retro, 1000, true);

    configureRetroTimer(
      retro,
      { targetDurationSeconds: 300, resetCountdown: true },
      4000,
    );

    expect(retro.timerState?.targetDurationSeconds).toBe(300);
    expect(retro.timerState?.roundAnchorSeconds).toBe(3);
  });

  it("extends from the current remaining target", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
    const retro = buildRetro();
    resetRetroTimer(retro, 1000, true);

    extendRetroTimer(retro, 300, 601000);

    expect(retro.timerState?.targetDurationSeconds).toBe(900);
    expect(retro.timerState?.running).toBe(true);
  });
});
