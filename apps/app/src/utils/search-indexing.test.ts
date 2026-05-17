import { describe, expect, it } from "vitest";

import {
  createRobotsTxtResponse,
  createSitemapXmlResponse,
  shouldPreventSearchIndexing,
} from "./search-indexing";

const productionEnv = { ENVIRONMENT: "production" as const };
const stagingEnv = { ENVIRONMENT: "staging" as const };

describe("search indexing responses", () => {
  it("allows indexing only on production hosts in production", () => {
    expect(
      shouldPreventSearchIndexing(
        productionEnv,
        new URL("https://sprintjam.co.uk/"),
      ),
    ).toBe(false);
    expect(
      shouldPreventSearchIndexing(
        productionEnv,
        new URL("https://preview.sprintjam.co.uk/"),
      ),
    ).toBe(true);
    expect(
      shouldPreventSearchIndexing(
        stagingEnv,
        new URL("https://staging.sprintjam.co.uk/"),
      ),
    ).toBe(true);
  });

  it("uses the request origin in production robots and sitemap responses", async () => {
    const url = new URL("https://www.sprintjam.co.uk/robots.txt");
    const robots = createRobotsTxtResponse(productionEnv, url);
    const sitemap = createSitemapXmlResponse(url);

    await expect(robots.text()).resolves.toContain(
      "Sitemap: https://www.sprintjam.co.uk/sitemap.xml",
    );
    await expect(sitemap.text()).resolves.toContain(
      "<loc>https://www.sprintjam.co.uk/</loc>",
    );
  });

  it("blocks staging and preview crawling in robots.txt", async () => {
    const url = new URL("https://staging.sprintjam.co.uk/");
    const robots = createRobotsTxtResponse(stagingEnv, url);

    await expect(robots.text()).resolves.toBe("User-agent: *\nDisallow: /");
  });
});
