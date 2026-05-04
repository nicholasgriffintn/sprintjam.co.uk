import type { LoaderFunctionArgs } from "react-router";

export type WorkerLoaderArgs = Pick<LoaderFunctionArgs, "request" | "context">;

export async function readWorkerJson<T>(
  response: Response,
  expectedStatus = 200,
): Promise<T | null> {
  if (response.status !== expectedStatus) {
    return null;
  }

  return (await response.json()) as T;
}

export function createWorkerRequest(request: Request, path: string): Request {
  const url = new URL(request.url);
  const target = new URL(path, url.origin);
  url.pathname = target.pathname;
  url.search = target.search;

  const headers = new Headers();
  const cookie = request.headers.get("Cookie");
  if (cookie) {
    headers.set("Cookie", cookie);
  }

  return new Request(url, {
    headers,
    method: "GET",
  });
}
