import { describe, expect, it } from "vitest";

import { readAuthUiRequest } from "./auth-ui-request";

describe("shared authentication UI requests", () => {
  it("accepts continuation context supplied by the shared React flow", () => {
    expect(
      readAuthUiRequest({
        action: "continue",
        continuationToken: "challenge-token",
        kind: "webauthn",
        values: {
          ceremony: "registration",
          credential: '{"credentialId":"credential"}',
          selectionToken: "selection-token",
        },
      }),
    ).toEqual({
      action: "continue",
      continuationToken: "challenge-token",
      kind: "webauthn",
      values: {
        ceremony: "registration",
        credential: '{"credentialId":"credential"}',
        selectionToken: "selection-token",
      },
    });
  });

  it("rejects unsupported actions", () => {
    expect(readAuthUiRequest({ action: "delete_everything" })).toBeUndefined();
  });
});
