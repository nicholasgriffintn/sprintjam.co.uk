import * as Sentry from "@sentry/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import type { ClientOnErrorFunction } from "react-router";
import { HydratedRouter } from "react-router/dom";

import { SENTRY_DSN } from "./constants";

Sentry.init({
  dsn: SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD,
});

const onError: ClientOnErrorFunction = (
  error,
  { location, params, pattern, errorInfo },
) => {
  console.error("[client] hydration error", {
    source: "react-router-client",
    url: `${location.pathname}${location.search ?? ""}${location.hash ?? ""}`,
    routePattern: pattern || undefined,
    params,
    componentStack: errorInfo?.componentStack ?? undefined,
    error,
  });
  Sentry.captureException(error, {
    tags: { source: "react-router-client" },
    extra: { routePattern: pattern || undefined },
  });
};

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter onError={onError} />
    </StrictMode>,
  );
});
