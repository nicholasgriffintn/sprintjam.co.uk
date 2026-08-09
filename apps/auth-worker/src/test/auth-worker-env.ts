import type { AuthWorkerEnv } from "@sprintjam/types";
import { vi } from "vitest";

export function createTestAuthWorkerEnv(): AuthWorkerEnv {
  return {
    DB: {
      prepare: vi.fn(),
      batch: vi.fn(),
      exec: vi.fn(),
      withSession: vi.fn(),
      dump: vi.fn(),
    },
    MAGIC_LINK_RATE_LIMITER: {
      limit: vi.fn().mockResolvedValue({ success: true }),
    },
    VERIFICATION_RATE_LIMITER: {
      limit: vi.fn().mockResolvedValue({ success: true }),
    },
    IP_RATE_LIMITER: {
      limit: vi.fn().mockResolvedValue({ success: true }),
    },
    SEND_EMAIL: {
      send: vi.fn().mockResolvedValue({ messageId: "test-message" }),
    },
    TOKEN_ENCRYPTION_SECRET:
      "test-encryption-secret-with-at-least-thirty-two-bytes",
  };
}
