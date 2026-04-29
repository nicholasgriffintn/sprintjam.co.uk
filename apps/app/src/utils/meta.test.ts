/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";

import { applyPageMeta } from "./meta";

describe("applyPageMeta", () => {
  beforeEach(() => {
    document.head.innerHTML = `
      <title>Existing</title>
      <meta name="description" content="Existing description" />
      <meta name="keywords" content="existing" />
      <meta property="og:title" content="Existing" />
      <meta property="og:description" content="Existing description" />
      <meta property="og:image" content="/existing.png" />
      <meta property="og:url" content="https://example.test" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content="Existing" />
      <meta name="twitter:description" content="Existing description" />
      <meta name="twitter:image" content="/existing.png" />
      <link rel="canonical" href="https://example.test" />
    `;
    window.history.replaceState({}, "", "/guides/planning-poker");
  });

  it("applies full route metadata synchronously", () => {
    applyPageMeta({
      title: "Planning Poker Guide - SprintJam",
      description: "Learn planning poker.",
      keywords: "planning poker, agile",
      ogImage: "/og-image.png",
    });

    expect(document.title).toBe("Planning Poker Guide - SprintJam");
    expect(getMeta("name", "description")).toBe("Learn planning poker.");
    expect(getMeta("name", "keywords")).toBe("planning poker, agile");
    expect(getMeta("property", "og:title")).toBe(
      "Planning Poker Guide - SprintJam",
    );
    expect(getMeta("property", "og:url")).toBe(
      "http://localhost:3000/guides/planning-poker",
    );
    expect(getMeta("name", "twitter:card")).toBe("summary_large_image");
    expect(getMeta("name", "twitter:image")).toBe("/og-image.png");
    expect(
      document.querySelector("link[rel='canonical']")?.getAttribute("href"),
    ).toBe("http://localhost:3000/guides/planning-poker");
  });
});

function getMeta(attributeName: "name" | "property", attributeValue: string) {
  return document
    .querySelector(`meta[${attributeName}="${attributeValue}"]`)
    ?.getAttribute("content");
}
