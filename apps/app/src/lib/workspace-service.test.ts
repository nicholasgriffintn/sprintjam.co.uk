import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/constants", () => ({
  API_BASE_URL: "http://localhost",
}));

import { HttpError } from "@/lib/errors";
import { createTeamSession, requestMagicLink } from "@/lib/workspace-service";

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

  it("routes retro workspace session creation through the retro worker", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ session: { id: 1 } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createTeamSession(
      "atlas-amber-amber",
      "Retro 14 May 2026",
      "2T0W2H",
      {
        type: "retro",
        templateId: "start-stop-continue",
        templateName: "Start, Stop, Continue",
      },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost/retros/workspace-sessions",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          teamSlug: "atlas-amber-amber",
          name: "Retro 14 May 2026",
          roomKey: "2T0W2H",
          metadata: {
            type: "retro",
            templateId: "start-stop-continue",
            templateName: "Start, Stop, Continue",
          },
        }),
      }),
    );
  });
});
