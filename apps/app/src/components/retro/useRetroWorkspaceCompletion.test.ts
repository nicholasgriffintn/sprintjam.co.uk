import { describe, expect, it, vi } from "vitest";
import type { RetroData, TeamSession } from "@sprintjam/types";
import { DEFAULT_RETRO_SETTINGS } from "@sprintjam/types";
import { getRetroTemplate } from "@sprintjam/utils";

import { HttpError } from "@/lib/errors";
import {
  completeSessionByRoomKey,
  recordRetroActionsByRoomKey,
} from "@/lib/workspace-service";
import { completeRetroWorkspaceHistory } from "./useRetroWorkspaceCompletion";

const buildRetro = (overrides: Partial<RetroData> = {}): RetroData => ({
  key: "RETRO1",
  template: getRetroTemplate(DEFAULT_RETRO_SETTINGS.templateId),
  settings: DEFAULT_RETRO_SETTINGS,
  moderator: "Alice",
  users: ["Alice"],
  connectedUsers: { Alice: true },
  phase: "focus",
  phaseStartedAt: 1,
  timerState: undefined,
  status: "active",
  cards: [],
  actionItems: [
    {
      id: "action-1",
      title: "Publish the checklist",
      owner: "Alice",
      dueAt: 1_700_000_000_000,
      priority: "high",
      createdAt: 1,
      completed: false,
    },
  ],
  readyUsers: [],
  createdAt: 1,
  ...overrides,
});

const teamSession: TeamSession = {
  id: 1,
  teamId: 1,
  roomKey: "RETRO1",
  name: "Retro",
  createdById: 1,
  createdAt: 1,
  completedAt: null,
  metadata: JSON.stringify({ type: "retro" }),
};

const createServices = () => ({
  recordActions: vi
    .fn<typeof recordRetroActionsByRoomKey>()
    .mockResolvedValue([]),
  completeSession: vi
    .fn<typeof completeSessionByRoomKey>()
    .mockResolvedValue(teamSession),
});

describe("completeRetroWorkspaceHistory", () => {
  it("records actions and completes workspace history for active retros", async () => {
    const services = createServices();
    const retro = buildRetro();

    const warning = await completeRetroWorkspaceHistory(
      { retroData: retro, retroKey: retro.key, isAuthenticated: true },
      services,
    );

    expect(warning).toBeNull();
    expect(services.recordActions).toHaveBeenCalledWith({
      roomKey: "RETRO1",
      actions: [
        {
          id: "action-1",
          title: "Publish the checklist",
          owner: "Alice",
          dueAt: 1_700_000_000_000,
          priority: "high",
          completed: false,
        },
      ],
    });
    expect(services.completeSession).toHaveBeenCalledWith("RETRO1", "retro");
  });

  it("skips workspace writes for signed-out users", async () => {
    const services = createServices();

    const warning = await completeRetroWorkspaceHistory(
      { retroData: buildRetro(), retroKey: "RETRO1", isAuthenticated: false },
      services,
    );

    expect(warning).toBeNull();
    expect(services.recordActions).not.toHaveBeenCalled();
    expect(services.completeSession).not.toHaveBeenCalled();
  });

  it("returns a visible warning when workspace completion fails", async () => {
    const services = createServices();
    services.completeSession.mockRejectedValue(new Error("Auth worker failed"));

    const warning = await completeRetroWorkspaceHistory(
      { retroData: buildRetro(), retroKey: "RETRO1", isAuthenticated: true },
      services,
    );

    expect(warning).toBe(
      "Auth worker failed Workspace history was not updated.",
    );
  });

  it("does not complete workspace history again for already completed retros", async () => {
    const services = createServices();
    const retro = buildRetro({ status: "completed", phase: "completed" });

    const warning = await completeRetroWorkspaceHistory(
      { retroData: retro, retroKey: retro.key, isAuthenticated: true },
      services,
    );

    expect(warning).toBeNull();
    expect(services.recordActions).toHaveBeenCalled();
    expect(services.completeSession).not.toHaveBeenCalled();
  });

  it("can force workspace session completion when retrying completed retros", async () => {
    const services = createServices();
    const retro = buildRetro({ status: "completed", phase: "completed" });

    const warning = await completeRetroWorkspaceHistory(
      {
        retroData: retro,
        retroKey: retro.key,
        isAuthenticated: true,
        forceCompleteSession: true,
      },
      services,
    );

    expect(warning).toBeNull();
    expect(services.completeSession).toHaveBeenCalledWith("RETRO1", "retro");
  });

  it("ignores missing workspace sessions", async () => {
    const services = createServices();
    services.completeSession.mockRejectedValue(
      new HttpError({ message: "Session not found", status: 404 }),
    );

    const warning = await completeRetroWorkspaceHistory(
      { retroData: buildRetro(), retroKey: "RETRO1", isAuthenticated: true },
      services,
    );

    expect(warning).toBeNull();
  });
});
