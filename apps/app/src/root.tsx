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

import { Header } from "@/components/layout/Header";
import { PageBackground } from "@/components/layout/PageBackground";
import { RouteDataHydrator } from "@/components/layout/RouteDataHydrator";
import { RoomHeaderProvider } from "@/context/RoomHeaderContext";
import { SessionProvider } from "@/context/SessionContext";
import { StandupHeaderProvider } from "@/context/StandupHeaderContext";
import { RoomProvider } from "@/context/RoomContext";
import { WheelHeaderProvider } from "@/context/WheelHeaderContext";
import { WorkspaceAuthProvider } from "@/context/WorkspaceAuthContext";
import { AppToastProvider } from "@/components/ui";
import { getBackgroundVariant } from "@/config/routes/derived";
import { parsePath } from "@/config/routes/navigation";
import { queryClient } from "@/lib/data/collections";
import { ThemeProvider } from "@/lib/theme-context";
import type { ServerDefaults } from "@/types";

import "./index.css";

type WorkerLoaderArgs = Pick<LoaderFunctionArgs, "request" | "context">;

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

async function readWorkerJson<T>(
  response: Response,
  expectedStatus = 200,
): Promise<T | null> {
  if (response.status !== expectedStatus) {
    return null;
  }

  return (await response.json()) as T;
}

function createWorkerRequest(request: Request, path: string): Request {
  const url = new URL(request.url);
  url.pathname = path;
  url.search = "";

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
}: WorkerLoaderArgs): Promise<ServerDefaults | null> {
  const roomWorker = context.cloudflare?.env.ROOM_WORKER;
  if (!roomWorker) {
    return null;
  }

  const response = await roomWorker.fetch(
    createWorkerRequest(request, "/api/defaults"),
  );

  return readWorkerJson<ServerDefaults>(response);
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const { screen } = parsePath(url.pathname);

  const [initialWorkspaceProfile, initialServerDefaults] = await Promise.all([
    loadWorkspaceProfile({ request, context }),
    loadServerDefaults({ request, context }),
  ]);

  return {
    screen,
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
  const { screen, initialWorkspaceProfile, initialServerDefaults } =
    useLoaderData<typeof loader>();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppToastProvider>
          <SessionProvider>
            <WorkspaceAuthProvider initialProfile={initialWorkspaceProfile}>
              <RouteDataHydrator serverDefaults={initialServerDefaults} />
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
            </WorkspaceAuthProvider>
          </SessionProvider>
        </AppToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
