import { type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";
import type { LinksFunction, LoaderFunctionArgs } from "react-router";
import type { WorkspaceAuthProfile } from "@sprintjam/types";

import {
  createWorkerRequest,
  readRequiredWorkerJson,
  readWorkerJson,
  type WorkerLoaderArgs,
} from "@/lib/worker-utils";

import { Header } from "@/components/layout/Header";
import { PageBackground } from "@/components/layout/PageBackground";
import { RoomHeaderProvider } from "@/context/RoomHeaderContext";
import { ServerDefaultsProvider } from "@/context/ServerDefaultsContext";
import { SessionProvider } from "@/context/SessionContext";
import { StandupHeaderProvider } from "@/context/StandupHeaderContext";
import { RoomProvider } from "@/context/RoomContext";
import { WheelHeaderProvider } from "@/context/WheelHeaderContext";
import { WorkspaceAuthProvider } from "@/context/WorkspaceAuthContext";
import { AppToastProvider } from "@/components/ui";
import { getBackgroundVariant } from "@/config/routes/derived";
import { useCurrentRoute } from "@/hooks/useCurrentRoute";
import { queryClient } from "@/lib/data/collections";
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

async function loadWorkspaceProfile({
  request,
  context,
}: WorkerLoaderArgs): Promise<WorkspaceAuthProfile | null> {
  const authWorker = context.cloudflare?.env.AUTH_WORKER;
  if (!authWorker) {
    return null;
  }

  const response = await authWorker.fetch(
    createWorkerRequest(request, "/api/auth/me"),
  );

  return readWorkerJson<WorkspaceAuthProfile>(response);
}

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
  const [initialWorkspaceProfile, initialServerDefaults] = await Promise.all([
    loadWorkspaceProfile({ request, context }),
    loadServerDefaults({ request, context }),
  ]);

  return {
    initialWorkspaceProfile,
    initialServerDefaults,
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
              <ServerDefaultsProvider defaults={initialServerDefaults}>
                <RoomProvider>
                  <RoomHeaderProvider>
                    <WheelHeaderProvider>
                      <StandupHeaderProvider>
                        <PageBackground variant={getBackgroundVariant(screen)}>
                          <Header />
                          <MotionConfig reducedMotion="user">
                            <main className="flex-1">
                              <Outlet />
                            </main>
                          </MotionConfig>
                        </PageBackground>
                      </StandupHeaderProvider>
                    </WheelHeaderProvider>
                  </RoomHeaderProvider>
                </RoomProvider>
              </ServerDefaultsProvider>
            </WorkspaceAuthProvider>
          </SessionProvider>
        </AppToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
