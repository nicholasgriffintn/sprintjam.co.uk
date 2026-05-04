export const STRUDEL_AI_MODEL = "@cf/zai-org/glm-4.7-flash";

export const POLYCHAT_STRUDEL_STYLES = [
  "techno",
  "ambient",
  "house",
  "jazz",
  "drums",
  "experimental",
] as const;

export type PolychatStrudelStyle = (typeof POLYCHAT_STRUDEL_STYLES)[number];
export type StrudelGenerationComplexity = "simple" | "medium" | "complex";

export interface StrudelGenerateRequest {
  prompt: string;
  style: PolychatStrudelStyle;
  tempo: number;
  complexity: StrudelGenerationComplexity;
  model?: string;
  options?: Record<string, unknown>;
}

export interface StrudelGenerateResponse {
  code: string;
  explanation: string;
  generationId: string;
}

const POLYCHAT_API_URL = "https://api.polychat.app";

export async function generateStrudelCode(
  request: StrudelGenerateRequest,
  apiToken: string,
): Promise<StrudelGenerateResponse> {
  try {
    if (!apiToken) {
      throw new Error("API token is required for Strudel code generation");
    }

    const body = JSON.stringify({
      ...request,
      model: STRUDEL_AI_MODEL,
      options: {
        cache_ttl_seconds: 1,
      },
    })

    const response = await fetch(`${POLYCHAT_API_URL}/apps/strudel/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "SprintJam/1.0",
        Authorization: `Bearer ${apiToken}`,
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Polychat API error: ${response.status} ${response.statusText} - ${errorText}`,
      );
      throw new Error(
        `Polychat API returned ${response.status}: ${response.statusText}`,
      );
    }

    const data = (await response.json()) as StrudelGenerateResponse;

    if (!data.code) {
      throw new Error("Invalid response from Polychat API");
    }

    return data;
  } catch (error) {
    console.error("Error calling Polychat API:", error);
    throw new Error(
      `Failed to generate music: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}
