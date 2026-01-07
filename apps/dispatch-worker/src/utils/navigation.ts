import type { AppScreen } from "@/context/SessionContext";

export function getScreenFromPath(path: string): AppScreen {
  if (path === "/" || !path) {
    return "welcome";
  }

  const pathWithoutQuery = path.split("?")[0];
  const pathWithoutTrailingSlash = pathWithoutQuery.endsWith("/")
    ? pathWithoutQuery.slice(0, -1)
    : pathWithoutQuery;

  switch (pathWithoutTrailingSlash) {
    case "/auth/login":
      return "login";
    case "/auth/verify":
      return "verify";
    case "/workspace":
      return "workspace";
    case "/create":
      return "create";
    case "/join":
      return "join";
    case "/room":
      return "room";
    case "/privacy":
      return "privacy";
    case "/terms":
      return "terms";
    case "/changelog":
      return "changelog";
  }

  return "404";
}

export function getPathFromScreen(screen: AppScreen): string {
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
      return "/room";
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

export function navigateTo(screen: AppScreen): void {
  const path = getPathFromScreen(screen);
  if (window.location.pathname !== path) {
    window.history.pushState({ screen }, "", path);
  }
}
