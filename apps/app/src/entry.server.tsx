import { renderToReadableStream } from "react-dom/server";
import { isbot } from "isbot";
import { ServerRouter } from "react-router";
import type { EntryContext, HandleErrorFunction } from "react-router";

export const streamTimeout = 5_000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  const body = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      signal: request.signal,
      onError(error: unknown) {
        if (request.signal.aborted) {
          return;
        }

        console.error("[ssr] renderToReadableStream error", {
          source: "react-dom-server",
          method: request.method,
          url: request.url,
          error,
        });

        responseStatusCode = 500;
      },
    },
  );

  if (isbot(request.headers.get("user-agent") ?? "")) {
    await body.allReady;
  }

  responseHeaders.set("Content-Type", "text/html");
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}

export const handleError: HandleErrorFunction = (
  error,
  { request, params },
) => {
  if (request.signal.aborted) {
    return;
  }

  console.error("[ssr] handleError", {
    source: "react-router-server",
    method: request.method,
    url: request.url,
    params,
    error,
  });
};
