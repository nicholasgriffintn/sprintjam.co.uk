import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/constants", () => ({
  API_BASE_URL: "http://localhost",
}));

import { HttpError } from "@/lib/errors";
import { requestMagicLink } from "@/lib/workspace-service";

describe("workspace-service", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("preserves auth-worker error codes and user-facing messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: "domain_not_allowed",
            message:
              "Your email domain is not authorized for workspace access. Please contact your administrator.",
            error:
              "Your email domain is not authorized for workspace access. Please contact your administrator.",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    const error = await requestMagicLink("blocked@example.com").catch(
      (caught) => caught,
    );

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({
      code: "domain_not_allowed",
      status: 403,
      message:
        "Your email domain is not authorized for workspace access. Please contact your administrator.",
    });
  });
});
