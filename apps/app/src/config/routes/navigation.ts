import type { RouteConfig } from "./types";
import { ROUTES, type AppScreen } from "./registry";
import { RETURN_URL_KEY } from "@/constants";

export interface ParsedPath {
  screen: AppScreen;
  roomKey?: string;
}

type RouteEntry = RouteConfig<AppScreen>;

const dynamicRoutes = (ROUTES as readonly RouteEntry[]).filter(
  (r) => r.pathPattern,
);
const staticPathToScreen = new Map<string, AppScreen>(
  (ROUTES as readonly RouteEntry[])
    .filter((r) => typeof r.path === "string")
    .map((r) => [r.path as string, r.screen]),
);

export function parsePath(path: string): ParsedPath {
  if (path === "/" || !path) {
    return { screen: "welcome" };
  }

  const pathWithoutQuery = path.split("?")[0];
  const normalizedPath = pathWithoutQuery.endsWith("/")
    ? pathWithoutQuery.slice(0, -1)
    : pathWithoutQuery;

  for (const route of dynamicRoutes) {
    const match = normalizedPath.match(route.pathPattern!);
    if (match) {
      if (route.screen === "room") {
        const roomKey = match[1];

        if (!roomKey) {
          return { screen: '404' };
        }

        return { screen: 'room', roomKey: roomKey.toUpperCase() };
      }
      return { screen: route.screen };
    }
  }

  const screen = staticPathToScreen.get(normalizedPath);
  if (screen) {
    return { screen };
  }

  return { screen: "404" };
}

export function getPathFromScreen(screen: AppScreen, roomKey?: string): string {
  const route = (ROUTES as readonly RouteEntry[]).find(
    (r) => r.screen === screen,
  );
  if (!route) return "/404";

  if (typeof route.path === "function") {
    return route.path({ roomKey });
  }
  return route.path;
}

export function navigateTo(screen: AppScreen, roomKey?: string): void {
  const path = getPathFromScreen(screen, roomKey);

  if (window.location.pathname !== path) {
    window.history.pushState({ screen, roomKey }, "", path);
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
