import { type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";
import type {
  LinksFunction,
  LoaderFunctionArgs,
} from "react-router";

import {
  createWorkerRequest,
  readRequiredWorkerJson,
  type WorkerLoaderArgs,
} from "@/lib/worker-utils";

import { AppShell } from "@/components/layout/AppShell";
import { SessionProvider } from "@/context/SessionContext";
import { WorkspaceAuthProvider } from "@/context/WorkspaceAuthContext";
import { AppToastProvider } from "@/components/ui";
import { useCurrentRoute } from "@/hooks/useCurrentRoute";
import { queryClient } from "@/lib/query-client";
import { loadWorkspaceAuthProfile } from "@/lib/workspace-loaders";
import { ThemeProvider } from "@/lib/theme-context";
import type { ServerDefaults } from "@/types";

import "./index.css";

const themeScript = `
(function () {
  var storageKey = "sprintjam_theme";
  var root = document.documentElement;
  var getPreferredTheme = function () {
    try {
      var stored = localStorage.getItem(storageKey);
      if (stored === "light" || stored === "dark") return stored;
    } catch (_) {}
    var prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  };
  root.classList.remove("light", "dark");
  root.classList.add(getPreferredTheme());
})();
`;

export const links: LinksFunction = () => [
  { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
  {
    rel: "icon",
    type: "image/png",
    sizes: "32x32",
    href: "/favicon-32x32.png",
  },
  {
    rel: "icon",
    type: "image/png",
    sizes: "16x16",
    href: "/favicon-16x16.png",
  },
  { rel: "manifest", href: "/site.webmanifest" },
];

async function loadServerDefaults({
  request,
  context,
}: WorkerLoaderArgs): Promise<ServerDefaults> {
  const roomWorker = context.cloudflare?.env.ROOM_WORKER;
  if (!roomWorker) {
    throw new Response("ROOM_WORKER binding is required to load defaults", {
      status: 500,
    });
  }

  const response = await roomWorker.fetch(
    createWorkerRequest(request, "/api/defaults"),
  );

  return readRequiredWorkerJson<ServerDefaults>(
    response,
    "Unable to load default settings from server",
  );
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  return {
    initialServerDefaults: await loadServerDefaults({ request, context }),
    initialWorkspaceProfile: await loadWorkspaceAuthProfile({
      request,
      context,
    }),
  };
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <div id="root" className="root">
          {children}
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { initialWorkspaceProfile, initialServerDefaults } =
    useLoaderData<typeof loader>();
  const { screen } = useCurrentRoute();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppToastProvider>
          <SessionProvider>
            <WorkspaceAuthProvider initialProfile={initialWorkspaceProfile}>
              <AppShell
                serverDefaults={initialServerDefaults}
                screen={screen}
              />
            </WorkspaceAuthProvider>
          </SessionProvider>
        </AppToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
