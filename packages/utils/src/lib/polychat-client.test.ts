import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";
import {
  generateStrudelCode,
  type StrudelGenerateRequest,
} from "./polychat-client";

const sampleRequest: StrudelGenerateRequest = {
  prompt: "Create a calm lobby loop",
  style: "ambient",
  tempo: 90,
  complexity: "medium",
};

const endpoint = "https://api.polychat.app/apps/strudel/generate";
const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

describe("generateStrudelCode", () => {
  it("throws when API token is missing", async () => {
    await expect(generateStrudelCode(sampleRequest, "")).rejects.toThrow(
      "API token is required for Strudel code generation",
    );
  });

  it("calls Polychat API and returns generated code on success", async () => {
    const apiData = {
      code: "stack($kick,$hat)",
      explanation: "Example groove",
      generationId: "abc123",
    };

    const json = vi
      .fn()
      .mockResolvedValue({ status: "success", data: apiData });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json,
    } as any);

    const result = await generateStrudelCode(sampleRequest, "token-123");

    expect(result).toEqual(apiData);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
          "Content-Type": "application/json",
          "User-Agent": "SprintJam/1.0",
        }),
      }),
    );

    const [, options] = (globalThis.fetch as unknown as Mock).mock.calls[0];
    const body = JSON.parse((options as any).body);
    expect(body).toMatchObject({
      ...sampleRequest,
      model: "cerebras/gpt-oss-120b",
      options: { cache_ttl_seconds: 1 },
    });
  });

  it("throws when the API response is not ok", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
    } as any);

    await expect(
      generateStrudelCode(sampleRequest, "token-123"),
    ).rejects.toThrow("Polychat API returned 502: Bad Gateway");
  });

  it("throws when the API reports an error payload", async () => {
    const json = vi.fn().mockResolvedValue({
      status: "error",
      error: "Upstream failure",
    });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json,
    } as any);

    await expect(
      generateStrudelCode(sampleRequest, "token-123"),
    ).rejects.toThrow("Upstream failure");
  });

  it("wraps unexpected fetch errors with a helpful message", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network down"));

    await expect(
      generateStrudelCode(sampleRequest, "token-123"),
    ).rejects.toThrow("Failed to generate music: network down");
  });
});
