import { describe, expect, it } from "vitest";

import { getWebAuthnRequestContext } from "./webauthn-context";

describe("getWebAuthnRequestContext", () => {
  it("derives origin and rpId from request URL", () => {
    const request = new Request(
      "https://sprintjam.co.uk/api/auth/mfa/setup/start",
      {
        method: "POST",
        headers: {
          Origin: "https://attacker.example",
        },
      },
    );

    const context = getWebAuthnRequestContext(request);

    expect(context).toEqual({
      origin: "https://sprintjam.co.uk",
      rpId: "sprintjam.co.uk",
    });
  });

  it("supports localhost development origins from request URL", () => {
    const request = new Request(
      "http://localhost:5173/api/auth/mfa/verify/start",
      {
        method: "POST",
      },
    );

    const context = getWebAuthnRequestContext(request);

    expect(context).toEqual({
      origin: "http://localhost:5173",
      rpId: "localhost",
    });
  });
});
