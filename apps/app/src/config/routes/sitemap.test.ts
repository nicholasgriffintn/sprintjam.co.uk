import { describe, expect, it } from "vitest";

import { ROUTE_DEFINITIONS } from "./definitions";
import { getSitemapEntries, renderSitemapXml } from "./sitemap";
import { NOINDEX_ROBOTS } from "@/utils/meta";

describe("route sitemap configuration", () => {
  it("keeps every indexable static route in the sitemap", () => {
    const missingScreens = ROUTE_DEFINITIONS.filter(
      (route) =>
        typeof route.path === "string" &&
        !("robots" in route.meta && route.meta.robots === NOINDEX_ROBOTS) &&
        !("sitemap" in route && route.sitemap),
    ).map((route) => route.screen);

    expect(missingScreens).toEqual([]);
  });

  it("does not include noindex routes in the sitemap", () => {
    const sitemapLocations = new Set(
      getSitemapEntries("https://sprintjam.co.uk").map(
        (entry) => new URL(entry.loc).pathname,
      ),
    );
    const noindexStaticPaths: string[] = [];

    for (const route of ROUTE_DEFINITIONS) {
      if (
        typeof route.path === "string" &&
        "robots" in route.meta &&
        route.meta.robots === NOINDEX_ROBOTS
      ) {
        noindexStaticPaths.push(route.path);
      }
    }

    for (const pathname of noindexStaticPaths) {
      expect(sitemapLocations.has(pathname)).toBe(false);
    }
  });

  it("uses the provided request origin for sitemap locations", () => {
    expect(getSitemapEntries("https://staging.sprintjam.co.uk")[0]?.loc).toBe(
      "https://staging.sprintjam.co.uk/",
    );
  });

  it("renders sitemap XML from route configuration", () => {
    const sitemap = renderSitemapXml(
      getSitemapEntries("https://sprintjam.co.uk"),
    );

    expect(sitemap).toContain("<loc>https://sprintjam.co.uk/</loc>");
    expect(sitemap).toContain("<loc>https://sprintjam.co.uk/retro</loc>");
  });
});
