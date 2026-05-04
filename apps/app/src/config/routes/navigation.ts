import { ROUTE_DEFINITIONS, type AppScreen } from "./definitions";
import type { RoutePathParams } from "./types";
import { RETURN_URL_KEY } from "@/constants";

export interface ParsedPath {
  screen: AppScreen;
  roomKey?: string;
  standupKey?: string;
}

type RouteEntry = (typeof ROUTE_DEFINITIONS)[number];
type DynamicRouteEntry = Extract<RouteEntry, { pathPattern: RegExp }>;

let dynamicRoutes: DynamicRouteEntry[] | undefined;
let staticPathToScreen: Map<string, AppScreen> | undefined;

function isDynamicRoute(route: RouteEntry): route is DynamicRouteEntry {
  return "pathPattern" in route;
}

function getDynamicRoutes(): DynamicRouteEntry[] {
  if (!dynamicRoutes) {
    dynamicRoutes = ROUTE_DEFINITIONS.filter(isDynamicRoute);
  }
  return dynamicRoutes;
}

function getStaticPathToScreen(): Map<string, AppScreen> {
  if (!staticPathToScreen) {
    staticPathToScreen = new Map<string, AppScreen>(
      ROUTE_DEFINITIONS.filter((r) => typeof r.path === "string").map((r) => [
        r.path as string,
        r.screen,
      ]),
    );
  }
  return staticPathToScreen;
}

export function parsePath(path: string): ParsedPath {
  if (path === "/" || !path) {
    return { screen: "welcome" };
  }

  const pathWithoutQuery = path.split("?")[0] ?? "";
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

      if (route.screen === "standupJoin" || route.screen === "standupRoom") {
        const standupKey = match[1];

        if (!standupKey) {
          if (route.screen === "standupJoin") {
            return { screen: "standupJoin" };
          }
          return { screen: "404" };
        }

        return { screen: route.screen, standupKey: standupKey.toUpperCase() };
      }

      return { screen: route.screen };
    }
  }

  return { screen: "404" };
}

export type RouteParams = RoutePathParams;

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
  const route = ROUTE_DEFINITIONS.find((r) => r.screen === screen);
  if (!route) return "/404";

  const resolvedParams = normaliseParams(params);

  if (typeof route.path === "function") {
    return route.path({
      roomKey: resolvedParams?.roomKey,
      wheelKey: resolvedParams?.wheelKey,
      standupKey: resolvedParams?.standupKey,
    });
  }
  return route.path;
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
