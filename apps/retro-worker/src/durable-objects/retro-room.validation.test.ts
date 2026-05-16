import type {
  DurableObjectState,
  DurableObjectStorage,
  DurableObjectNamespace,
  RateLimit,
} from "@cloudflare/workers-types";
import {
  DEFAULT_RETRO_SETTINGS,
  type RetroStateData,
  type RetroWorkerEnv,
} from "@sprintjam/types";
import { getRetroTemplate } from "@sprintjam/utils";
import { describe, expect, it, vi } from "vitest";

import { RetroRoom } from "./retro-room";

const buildRetro = (
  overrides: Partial<RetroStateData> = {},
): RetroStateData => {
  const now = Date.now();

  return {
    key: "RETRO1",
    template: getRetroTemplate(DEFAULT_RETRO_SETTINGS.templateId),
    settings: DEFAULT_RETRO_SETTINGS,
    moderator: "Alice",
    users: ["Alice", "Bob"],
    connectedUsers: { Alice: true, Bob: true },
    phase: "input",
    phaseStartedAt: now,
    status: "active",
    cards: [],
    actionItems: [],
    readyUsers: [],
    createdAt: now,
    sessionTokens: {
      Alice: { token: "moderator-token", createdAt: now },
      Bob: { token: "participant-token", createdAt: now },
    },
    ...overrides,
  };
};

const createStorage = (retro?: RetroStateData): DurableObjectStorage => {
  const data = new Map<string, unknown>();
  if (retro) {
    data.set("retro", retro);
  }

  return {
    get: vi.fn(async (key: string) => data.get(key)),
    put: vi.fn(async (key: string, value: unknown) => {
      data.set(key, value);
    }),
  } as unknown as DurableObjectStorage;
};

const createRoom = (retro?: RetroStateData): RetroRoom =>
  new RetroRoom({ storage: createStorage(retro) } as DurableObjectState, {
    ENVIRONMENT: "development",
    RETRO_ROOM: {} as DurableObjectNamespace,
    TOKEN_ENCRYPTION_SECRET: "test-secret",
    RETRO_CREATE_RATE_LIMITER: {} as RateLimit,
    RETRO_JOIN_RATE_LIMITER: {} as RateLimit,
    RETRO_IP_RATE_LIMITER: {} as RateLimit,
  } satisfies RetroWorkerEnv);

const validate = (room: RetroRoom, path: string, token?: string) =>
  room.fetch(
    new Request(`https://internal${path}`, {
      method: "POST",
      headers: token ? { Cookie: `retro_session=${token}` } : undefined,
    }),
  );

describe("RetroRoom session validation", () => {
  it("accepts the moderator token for moderator-only validation", async () => {
    const response = await validate(
      createRoom(buildRetro()),
      "/session/validate-moderator",
      "moderator-token",
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
  });

  it("rejects participant tokens for moderator-only validation", async () => {
    const response = await validate(
      createRoom(buildRetro()),
      "/session/validate-moderator",
      "participant-token",
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Moderator session is required",
    });
  });

  it("still accepts participant tokens for regular room-session validation", async () => {
    const response = await validate(
      createRoom(buildRetro()),
      "/session/validate-any",
      "participant-token",
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
  });
});
