import { describe, it, expect } from "vitest";
import { checkBotProtection } from "./bot-check";

describe("checkBotProtection", () => {
  it("returns null when bot protection is disabled", () => {
    const request = new Request("https://example.com", {
      method: "POST",
    });

    const result = checkBotProtection(request, false);

    expect(result).toBeNull();
  });

  it("returns null when valid user-agent header is present", () => {
    const request = new Request("https://example.com", {
      method: "POST",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const result = checkBotProtection(request, true);

    expect(result).toBeNull();
  });

  it("returns error response when user-agent header is missing", () => {
    const request = new Request("https://example.com", {
      method: "POST",
    });

    const result = checkBotProtection(request, true);

    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it("returns error response when user-agent header is a bot", () => {
    const request = new Request("https://example.com", {
      method: "POST",
      headers: {
        "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)",
      },
    });

    const result = checkBotProtection(request, true);

    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });
});
