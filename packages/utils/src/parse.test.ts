import { describe, expect, it, vi } from "vitest";
import { parseJudgeScore, parseVote, safeJsonParse } from "./parse";

describe("parse utils", () => {
  describe("parseVote", () => {
    it("returns empty string for nullish values", () => {
      expect(parseVote(null)).toBe("");
      expect(parseVote(undefined)).toBe("");
    });

    it("converts numeric strings to numbers", () => {
      expect(parseVote("3")).toBe(3);
      expect(parseVote("0")).toBe(0);
    });

    it("preserves non-numeric strings", () => {
      expect(parseVote("abc")).toBe("abc");
    });
  });

  describe("parseJudgeScore", () => {
    it("returns null for nullish values", () => {
      expect(parseJudgeScore(null)).toBeNull();
      expect(parseJudgeScore(undefined)).toBeNull();
    });

    it("converts numeric strings to numbers", () => {
      expect(parseJudgeScore("4")).toBe(4);
    });

    it("preserves non-numeric strings", () => {
      expect(parseJudgeScore("N/A")).toBe("N/A");
    });
  });

  describe("safeJsonParse", () => {
    it("parses valid JSON", () => {
      const json = '{"foo":"bar","num":1}';
      expect(safeJsonParse<Record<string, unknown>>(json)).toEqual({
        foo: "bar",
        num: 1,
      });
    });

    it("returns undefined and logs on invalid JSON", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = safeJsonParse('{"foo":bad}');
      expect(result).toBeUndefined();
      expect(spy).toHaveBeenCalledOnce();
      spy.mockRestore();
    });
  });
});
