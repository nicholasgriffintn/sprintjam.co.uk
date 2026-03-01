import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import * as Sentry from "@sentry/react";

import "./index.css";
import App from "./App.tsx";
import { queryClient } from "./lib/data/collections";
import { ThemeProvider } from "./lib/theme-context";
import { SENTRY_DSN } from "./constants";
import { AppToastProvider } from "./components/ui";

Sentry.init({
  dsn: SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enabled: import.meta.env.PROD,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      <ThemeProvider>
        <AppToastProvider>
          <App />
        </AppToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
