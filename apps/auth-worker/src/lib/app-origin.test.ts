import { describe, expect, it } from "vitest";

import { resolveSprintJamAppOrigin } from "./app-origin";

describe("resolveSprintJamAppOrigin", () => {
  it("uses known production and staging origins", () => {
    expect(
      resolveSprintJamAppOrigin(
        new Request("https://sprintjam.co.uk/api/auth"),
        "production",
      ),
    ).toBe("https://sprintjam.co.uk");
    expect(
      resolveSprintJamAppOrigin(
        new Request("https://staging.sprintjam.co.uk/api/auth"),
        "staging",
      ),
    ).toBe("https://staging.sprintjam.co.uk");
  });

  it("rejects unexpected hosts and allows localhost only in development", () => {
    expect(
      resolveSprintJamAppOrigin(
        new Request("https://attacker.example/api/auth"),
        "production",
      ),
    ).toBe("https://sprintjam.co.uk");
    expect(
      resolveSprintJamAppOrigin(
        new Request("http://localhost:5173/api/auth"),
        "development",
      ),
    ).toBe("http://localhost:5173");
  });
});
