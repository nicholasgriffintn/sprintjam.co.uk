import { describe, expect, it } from "vitest";

import {
  mapSprintJamChallengeRecord,
  SprintJamChallengePayloadCipher,
} from "./shared-auth-storage";

const challenge = {
  tokenHash: "token-hash",
  provider: "otp",
  kind: "mfa_setup" as const,
  payload: { secret: "totp-secret" },
  createdAt: new Date("2026-08-08T10:00:00.000Z"),
  expiresAt: new Date("2026-08-08T10:05:00.000Z"),
  attempts: 0,
};

describe("SprintJamChallengePayloadCipher", () => {
  it("encrypts stored challenge payloads and binds them to their metadata", async () => {
    const cipher = new SprintJamChallengePayloadCipher("test-secret");
    const encrypted = await cipher.encrypt(challenge);

    expect(encrypted).not.toContain("totp-secret");
    await expect(
      mapSprintJamChallengeRecord(
        {
          ...challenge,
          createdAt: challenge.createdAt.getTime(),
          expiresAt: challenge.expiresAt.getTime(),
          payload: encrypted,
        },
        cipher,
      ),
    ).resolves.toEqual(challenge);

    await expect(
      mapSprintJamChallengeRecord(
        {
          ...challenge,
          tokenHash: "different-token-hash",
          createdAt: challenge.createdAt.getTime(),
          expiresAt: challenge.expiresAt.getTime(),
          payload: encrypted,
        },
        cipher,
      ),
    ).rejects.toThrow("integrity compromised");
  });
});
