export interface StrudelGenerateRequest {
  prompt: string;
  style: string;
  tempo: number;
  complexity: string;
  model?: string;
  options?: Record<string, unknown>;
}

export interface StrudelGenerateResponse {
  code: string;
  explanation: string;
  generationId: string;
}

const POLYCHAT_API_URL = 'https://api.polychat.app';

export async function generateStrudelCode(
  request: StrudelGenerateRequest,
  apiToken: string
): Promise<StrudelGenerateResponse> {
  try {
    if (!apiToken) {
      throw new Error('API token is required for Strudel code generation');
    }

    const response = await fetch(`${POLYCHAT_API_URL}/apps/strudel/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SprintJam/1.0',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        ...request,
        model: 'cerebras/gpt-oss-120b',
        options: {
          cache_ttl_seconds: 1,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Polychat API returned ${response.status}: ${response.statusText}`
      );
    }

    const data = (await response.json()) as StrudelGenerateResponse;

    if (!data.code) {
      throw new Error('Invalid response from Polychat API');
    }

    return data;
  } catch (error) {
    console.error('Error calling Polychat API:', error);
    throw new Error(
      `Failed to generate music: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}
