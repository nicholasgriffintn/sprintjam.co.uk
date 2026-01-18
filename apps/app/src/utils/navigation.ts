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

  if (pathWithoutTrailingSlash.startsWith("/integrations")) {
    if (pathWithoutTrailingSlash === "/integrations") {
      return { screen: "integrations" };
    }

    if (pathWithoutTrailingSlash === "/integrations/jira") {
      return { screen: "integrationsJira" };
    }

    if (pathWithoutTrailingSlash === "/integrations/linear") {
      return { screen: "integrationsLinear" };
    }

    if (pathWithoutTrailingSlash === "/integrations/github") {
      return { screen: "integrationsGithub" };
    }
  }

  if (pathWithoutTrailingSlash.startsWith("/guides")) {
    if (pathWithoutTrailingSlash === "/guides") {
      return { screen: "guides" };
    }

    if (pathWithoutTrailingSlash === "/guides/planning-poker") {
      return { screen: "guidesPlanningPoker" };
    }

    if (pathWithoutTrailingSlash === "/guides/fibonacci-scale") {
      return { screen: "guidesFibonacciScale" };
    }

    if (pathWithoutTrailingSlash === "/guides/fibonacci-short") {
      return { screen: "guidesFibonacciShort" };
    }

    if (pathWithoutTrailingSlash === "/guides/doubling-scale") {
      return { screen: "guidesDoublingScale" };
    }

    if (pathWithoutTrailingSlash === "/guides/tshirt-sizing") {
      return { screen: "guidesTshirtSizing" };
    }

    if (pathWithoutTrailingSlash === "/guides/planet-scale") {
      return { screen: "guidesPlanetScale" };
    }

    if (pathWithoutTrailingSlash === "/guides/yes-no") {
      return { screen: "guidesYesNo" };
    }

    if (pathWithoutTrailingSlash === "/guides/simple-scale") {
      return { screen: "guidesSimpleScale" };
    }

    if (pathWithoutTrailingSlash === "/guides/hours-estimates") {
      return { screen: "guidesHoursEstimates" };
    }

    if (pathWithoutTrailingSlash === "/guides/session-roles") {
      return { screen: "guidesSessionRoles" };
    }

    if (pathWithoutTrailingSlash === "/guides/remote-estimation") {
      return { screen: "guidesRemoteEstimation" };
    }

    if (pathWithoutTrailingSlash === "/guides/story-points") {
      return { screen: "guidesStoryPoints" };
    }

    if (pathWithoutTrailingSlash === "/guides/sprint-planning") {
      return { screen: "guidesSprintPlanning" };
    }

    if (pathWithoutTrailingSlash === "/guides/consensus-building") {
      return { screen: "guidesConsensusBuilding" };
    }

    if (pathWithoutTrailingSlash === "/guides/structured-voting") {
      return { screen: "guidesStructuredVoting" };
    }
  }

  switch (pathWithoutTrailingSlash) {
    case "/auth/login":
      return { screen: "login" };
    case "/workspace":
      return { screen: "workspace" };
    case "/workspace/sessions":
      return { screen: "workspaceSessions" };
    case "/workspace/admin":
      return { screen: "workspaceAdmin" };
    case "/workspace/admin/teams":
      return { screen: "workspaceAdminTeams" };
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
    case "/faq":
      return { screen: "faq" };
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
    case "workspace":
      return "/workspace";
    case "workspaceSessions":
      return "/workspace/sessions";
    case "workspaceAdmin":
      return "/workspace/admin";
    case "workspaceAdminTeams":
      return "/workspace/admin/teams";
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
    case "faq":
      return "/faq";
    case "integrations":
      return "/integrations";
    case "integrationsJira":
      return "/integrations/jira";
    case "integrationsLinear":
      return "/integrations/linear";
    case "integrationsGithub":
      return "/integrations/github";
    case "guides":
      return "/guides";
    case "guidesPlanningPoker":
      return "/guides/planning-poker";
    case "guidesFibonacciScale":
      return "/guides/fibonacci-scale";
    case "guidesFibonacciShort":
      return "/guides/fibonacci-short";
    case "guidesDoublingScale":
      return "/guides/doubling-scale";
    case "guidesTshirtSizing":
      return "/guides/tshirt-sizing";
    case "guidesPlanetScale":
      return "/guides/planet-scale";
    case "guidesYesNo":
      return "/guides/yes-no";
    case "guidesSimpleScale":
      return "/guides/simple-scale";
    case "guidesHoursEstimates":
      return "/guides/hours-estimates";
    case "guidesSessionRoles":
      return "/guides/session-roles";
    case "guidesRemoteEstimation":
      return "/guides/remote-estimation";
    case "guidesStoryPoints":
      return "/guides/story-points";
    case "guidesSprintPlanning":
      return "/guides/sprint-planning";
    case "guidesConsensusBuilding":
      return "/guides/consensus-building";
    case "guidesStructuredVoting":
      return "/guides/structured-voting";
    case "404":
      return "/404";
  }
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
