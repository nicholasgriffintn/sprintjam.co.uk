import type { AppScreen } from "@/context/SessionContext";
import { RETURN_URL_KEY } from "@/constants";

export interface ParsedPath {
  screen: AppScreen;
  roomKey?: string;
}

export function parsePath(path: string): ParsedPath {
  if (path === "/" || !path) {
    return { screen: "welcome" };
  }

  const pathWithoutQuery = path.split("?")[0];
  const pathWithoutTrailingSlash = pathWithoutQuery.endsWith("/")
    ? pathWithoutQuery.slice(0, -1)
    : pathWithoutQuery;

  const roomMatch = pathWithoutTrailingSlash.match(/^\/room\/([A-Z0-9]+)$/i);
  if (roomMatch) {
    return { screen: "room", roomKey: roomMatch[1].toUpperCase() };
  }

  switch (pathWithoutTrailingSlash) {
    case "/auth/login":
      return { screen: "login" };
    case "/auth/verify":
      return { screen: "verify" };
    case "/workspace":
      return { screen: "workspace" };
    case "/create":
      return { screen: "create" };
    case "/join":
      return { screen: "join" };
    case "/room":
      return { screen: "room" };
    case "/privacy":
      return { screen: "privacy" };
    case "/terms":
      return { screen: "terms" };
    case "/changelog":
      return { screen: "changelog" };
  }

  return { screen: "404" };
}

export function getScreenFromPath(path: string): AppScreen {
  return parsePath(path).screen;
}

export function getPathFromScreen(screen: AppScreen, roomKey?: string): string {
  switch (screen) {
    case "welcome":
      return "/";
    case "login":
      return "/auth/login";
    case "verify":
      return "/auth/verify";
    case "workspace":
      return "/workspace";
    case "create":
      return "/create";
    case "join":
      return "/join";
    case "room":
      return roomKey ? `/room/${roomKey}` : "/room";
    case "privacy":
      return "/privacy";
    case "terms":
      return "/terms";
    case "changelog":
      return "/changelog";
    case "404":
      return "/404";
  }
}

export function navigateTo(screen: AppScreen, roomKey?: string): void {
  const path = getPathFromScreen(screen, roomKey);
  if (window.location.pathname !== path) {
    window.history.pushState({ screen, roomKey }, "", path);
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
