import { API_BASE_URL } from "@/constants";
import { readJsonSafe } from "@/lib/api-utils";

type ProviderHttpMethod = "GET" | "POST" | "PUT" | "DELETE";

const JSON_HEADERS = {
  "Content-Type": "application/json",
} as const;

interface ProviderRequestOptions {
  method?: ProviderHttpMethod;
  body?: unknown;
  fallbackError: string;
  includeStatusInFallback?: boolean;
}

const resolveFallbackMessage = (
  fallbackError: string,
  status: number,
  includeStatusInFallback: boolean,
): string =>
  includeStatusInFallback ? `${fallbackError}: ${status}` : fallbackError;

export async function providerRequestJson<T>(
  path: string,
  options: ProviderRequestOptions,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "POST",
    headers: JSON_HEADERS,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await readJsonSafe(response);
    throw new Error(
      (errorData?.error as string) ||
        resolveFallbackMessage(
          options.fallbackError,
          response.status,
          options.includeStatusInFallback ?? false,
        ),
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("Invalid response format from server");
  }
}

export async function providerRequestVoid(
  path: string,
  options: ProviderRequestOptions,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "POST",
    headers: JSON_HEADERS,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await readJsonSafe(response);
    throw new Error(
      (errorData?.error as string) ||
        resolveFallbackMessage(
          options.fallbackError,
          response.status,
          options.includeStatusInFallback ?? false,
        ),
    );
  }
}
