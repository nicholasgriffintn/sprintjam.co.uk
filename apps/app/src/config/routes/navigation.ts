import type { RouteConfig } from "./types";
import { ROUTES, type AppScreen } from "./registry";
import { RETURN_URL_KEY } from "@/constants";

export interface ParsedPath {
  screen: AppScreen;
  roomKey?: string;
}

type RouteEntry = RouteConfig<AppScreen>;

let dynamicRoutes: RouteEntry[] | undefined;
let staticPathToScreen: Map<string, AppScreen> | undefined;

function getDynamicRoutes(): RouteEntry[] {
  if (!dynamicRoutes) {
    dynamicRoutes = (ROUTES as readonly RouteEntry[]).filter(
      (r) => r.pathPattern,
    );
  }
  return dynamicRoutes;
}

function getStaticPathToScreen(): Map<string, AppScreen> {
  if (!staticPathToScreen) {
    staticPathToScreen = new Map<string, AppScreen>(
      (ROUTES as readonly RouteEntry[])
        .filter((r) => typeof r.path === "string")
        .map((r) => [r.path as string, r.screen]),
    );
  }
  return staticPathToScreen;
}

export function parsePath(path: string): ParsedPath {
  if (path === "/" || !path) {
    return { screen: "welcome" };
  }

  const pathWithoutQuery = path.split("?")[0];
  const normalizedPath = pathWithoutQuery.endsWith("/")
    ? pathWithoutQuery.slice(0, -1)
    : pathWithoutQuery;

  const screen = getStaticPathToScreen().get(normalizedPath);
  if (screen) {
    return { screen };
  }

  for (const route of getDynamicRoutes()) {
    const match = normalizedPath.match(route.pathPattern!);
    if (match) {
      if (route.screen === "room") {
        const roomKey = match[1];

        if (!roomKey) {
          return { screen: "404" };
        }

        return { screen: "room", roomKey: roomKey.toUpperCase() };
      }
      return { screen: route.screen };
    }
  }

  return { screen: "404" };
}

export type RouteParams = { roomKey?: string; wheelKey?: string };

function normaliseParams(
  params?: RouteParams | string,
): RouteParams | undefined {
  if (typeof params === "string") {
    return { roomKey: params };
  }
  return params;
}

export function getPathFromScreen(
  screen: AppScreen,
  params?: RouteParams | string,
): string {
  const route = (ROUTES as readonly RouteEntry[]).find(
    (r) => r.screen === screen,
  );
  if (!route) return "/404";

  const resolvedParams = normaliseParams(params);

  if (typeof route.path === "function") {
    return route.path({
      roomKey: resolvedParams?.roomKey,
      wheelKey: resolvedParams?.wheelKey,
    });
  }
  return route.path;
}

export function navigateTo(
  screen: AppScreen,
  params?: RouteParams | string,
): void {
  const resolvedParams = normaliseParams(params);
  const path = getPathFromScreen(screen, resolvedParams);

  if (window.location.pathname !== path) {
    window.history.pushState({ screen, ...resolvedParams }, "", path);
  }

  const scrollToTop = () =>
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });

  if ("requestAnimationFrame" in window) {
    window.requestAnimationFrame(scrollToTop);
  } else {
    scrollToTop();
  }
}

export function setReturnUrl(url: string): void {
  sessionStorage.setItem(RETURN_URL_KEY, url);
}

export function getReturnUrl(): string | null {
  return sessionStorage.getItem(RETURN_URL_KEY);
}

export function clearReturnUrl(): void {
  sessionStorage.removeItem(RETURN_URL_KEY);
}

export function getScreenFromPath(path: string): AppScreen {
  return parsePath(path).screen;
}
