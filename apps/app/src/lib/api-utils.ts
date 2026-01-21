import { HttpError, NetworkError } from "@/lib/errors";

export const readJsonSafe = async (
  response: Response,
): Promise<Record<string, unknown> | null> => {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const handleJsonResponse = async <T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> => {
  if (!response.ok) {
    const body = await readJsonSafe(response);
    throw new HttpError({
      message: (body?.error as string) || fallbackMessage,
      status: response.status,
      code: (body?.code as string) || undefined,
    });
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new NetworkError("Invalid response from server", { cause: error });
  }
};
