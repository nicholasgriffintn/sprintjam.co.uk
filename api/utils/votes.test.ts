import { describe, it, expect } from "vitest";
import { generateVoteOptionsMetadata } from "./votes";

describe("Vote Options Metadata", () => {
  describe("generateVoteOptionsMetadata", () => {
    it("generates metadata for numeric options", () => {
      const options = [1, 2, 3, 5, 8];
      const metadata = generateVoteOptionsMetadata(options);

      expect(metadata).toHaveLength(5);
      metadata.forEach((item) => {
        expect(item).toHaveProperty("value");
        expect(item).toHaveProperty("background");
        expect(item).toHaveProperty("taskSize");
      });
    });

    it("generates metadata for string options", () => {
      const options = ["?", "coffee"];
      const metadata = generateVoteOptionsMetadata(options);

      expect(metadata).toHaveLength(2);
      expect(metadata[0].value).toBe("?");
      expect(metadata[1].value).toBe("coffee");
    });

    it("generates metadata for mixed options", () => {
      const options = [1, 2, 3, 5, 8, "?", "coffee"];
      const metadata = generateVoteOptionsMetadata(options);

      expect(metadata).toHaveLength(7);
      expect(metadata.map((m) => m.value)).toEqual([
        1,
        2,
        3,
        5,
        8,
        "?",
        "coffee",
      ]);
    });

    it("assigns background colors to all options", () => {
      const options = [1, 3, 5, "?"];
      const metadata = generateVoteOptionsMetadata(options);

      metadata.forEach((item) => {
        expect(item.background).toBeDefined();
        expect(typeof item.background).toBe("string");
        expect(item.background).toMatch(/^(hsl\([^)]+\)|#[0-9a-f]{6})$/i);
      });
    });

    it("assigns task sizes to numeric options", () => {
      const options = [1, 3, 5, 8, 13];
      const metadata = generateVoteOptionsMetadata(options);

      metadata.forEach((item) => {
        expect(["xs", "sm", "md", "lg", "xl", null]).toContain(item.taskSize);
      });
    });

    it("handles empty array", () => {
      const metadata = generateVoteOptionsMetadata([]);
      expect(metadata).toHaveLength(0);
    });

    it("uses special colors for known special values", () => {
      const options = ["?", "coffee"];
      const metadata = generateVoteOptionsMetadata(options);

      expect(metadata[0].background).toBeDefined();
      expect(metadata[1].background).toBeDefined();
    });

    it("calculates max value correctly for color generation", () => {
      const options = [1, 2, 100];
      const metadata = generateVoteOptionsMetadata(options);

      expect(metadata[2].value).toBe(100);
      expect(metadata[2].background).toBeDefined();
    });

    it("handles non-numeric string values", () => {
      const options = ["small", "medium", "large"];
      const metadata = generateVoteOptionsMetadata(options);

      expect(metadata).toHaveLength(3);
      metadata.forEach((item) => {
        expect(item.background).toBeDefined();
        expect(item.taskSize).toBeDefined();
      });
    });
  });
});
