import { describe, expect, it } from "vitest";

import { createTeamSlugCandidate, isTeamSlug } from "./team-slug";

describe("team slugs", () => {
  it("accepts exactly three lowercase words", () => {
    expect(isTeamSlug("amber-cobalt-ripple")).toBe(true);
    expect(isTeamSlug("amber-cobalt")).toBe(false);
    expect(isTeamSlug("amber-cobalt-ripple-zenith")).toBe(false);
    expect(isTeamSlug("Amber-cobalt-ripple")).toBe(false);
    expect(isTeamSlug("amber-12-ripple")).toBe(false);
  });

  it("generates a three-word slug candidate", () => {
    expect(isTeamSlug(createTeamSlugCandidate())).toBe(true);
  });
});
