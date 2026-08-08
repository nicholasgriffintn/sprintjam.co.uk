import { describe, expect, it } from "vitest";

import { adaptAuthUiClientResponse } from "./auth-ui-response";

describe("shared authentication UI responses", () => {
  it("returns recovery codes through the shared authenticated result", async () => {
    const response = await adaptAuthUiClientResponse(
      Response.json({
        status: "authenticated",
        user: { id: "user-1" },
        recoveryCodes: ["first", "second"],
      }),
    );

    await expect(response.json()).resolves.toEqual({
      status: "authenticated",
      user: { profile: { id: "user-1" } },
      recoveryCodes: ["first", "second"],
    });
  });

  it("preserves authentication error responses", async () => {
    const response = await adaptAuthUiClientResponse(
      Response.json({ error: "Invalid code" }, { status: 400 }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid code" });
  });
});
