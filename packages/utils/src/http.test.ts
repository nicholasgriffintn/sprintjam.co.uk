import { describe, expect, it } from "vitest";

import { createJsonResponse, jsonError } from "./http";

describe("http utils", () => {
  it("creates a JSON response with the provided body and status", async () => {
    const response = createJsonResponse({ ok: true }, 201);
    expect(response.status).toBe(201);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("creates a JSON error response with default status", async () => {
    const response = jsonError("nope");
    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    await expect(response.json()).resolves.toEqual({ error: "nope" });
  });

  it("supports custom error statuses", async () => {
    const response = jsonError("forbidden", 403);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "forbidden" });
  });
});
