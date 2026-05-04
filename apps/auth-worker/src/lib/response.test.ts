import { describe, expect, it } from "vitest";

import { jsonError, unauthorizedResponse } from "./response";

describe("response helpers", () => {
  it("returns a standard error payload with code and message", async () => {
    const response = jsonError("Access denied", 403);
    const body = (await response.json()) as {
      code: string;
      message: string;
      error: string;
    };

    expect(body).toEqual({
      code: "forbidden",
      message: "Access denied",
      error: "Access denied",
    });
  });

  it("allows explicit error codes for auth flows", async () => {
    const response = unauthorizedResponse("Session expired", "session_expired");
    const body = (await response.json()) as {
      code: string;
      message: string;
      error: string;
    };

    expect(body).toEqual({
      code: "session_expired",
      message: "Session expired",
      error: "Session expired",
    });
  });
});
