import { ROUTE_DEFINITIONS, type AppScreen } from "./definitions";
import type { RouteDefinition, RouteGroup } from "./types";
import type { PageBackgroundVariant } from "@/components/layout/PageBackground";
import type {
  HeaderVariant,
  MarketingVariant,
} from "@/components/layout/Header/types";
import type { MetaTagConfig } from "@/utils/meta";

type RouteEntry = RouteDefinition<AppScreen>;
const ROUTE_ENTRIES: readonly RouteEntry[] = ROUTE_DEFINITIONS;

let routeByScreen: Map<AppScreen, RouteEntry> | undefined;

function getRouteByScreen(): Map<AppScreen, RouteEntry> {
  if (!routeByScreen) {
    routeByScreen = new Map<AppScreen, RouteEntry>(
      ROUTE_ENTRIES.map((route) => [route.screen, route]),
    );
  }
  return routeByScreen;
}

const GROUP_BACKGROUNDS: Record<RouteGroup, PageBackgroundVariant> = {
  marketing: "compact",
  workspace: "plain",
  room: "room",
  auth: "compact",
  flow: "compact",
  wheel: "compact",
  standup: "compact",
};

const GROUP_HEADERS: Record<RouteGroup, HeaderVariant> = {
  marketing: "marketing",
  workspace: "workspace",
  room: "room",
  auth: "marketing",
  flow: "marketing",
  wheel: "wheel",
  standup: "standup",
};

export function getRouteDefinition(screen: AppScreen): RouteEntry | undefined {
  return getRouteByScreen().get(screen);
}

export function getBackgroundVariant(screen: AppScreen): PageBackgroundVariant {
  const route = getRouteByScreen().get(screen);
  if (!route) return "compact";
  if (route.layout?.background) return route.layout.background;
  return GROUP_BACKGROUNDS[route.group];
}

export function getHeaderVariant(screen: AppScreen): HeaderVariant {
  const route = getRouteByScreen().get(screen);
  if (!route) return "marketing";
  if (route.layout?.header) return route.layout.header;
  return GROUP_HEADERS[route.group];
}

export function getMarketingVariant(screen: AppScreen): MarketingVariant {
  const route = getRouteByScreen().get(screen);
  return route?.layout?.marketingVariant ?? "compact";
}

export function getMetaConfig(screen: AppScreen): MetaTagConfig | undefined {
  return getRouteByScreen().get(screen)?.meta;
}

export function getWorkspaceNavItems() {
  return ROUTE_ENTRIES.filter(
    (r) => r.group === "workspace" && r.nav && !r.parent,
  )
    .sort((a, b) => (a.nav?.order ?? 99) - (b.nav?.order ?? 99))
    .map((route) => ({
      screen: route.screen,
      label: route.nav!.label,
      icon: route.nav!.icon,
      activeForScreens: (route.nav!.activeForScreens ?? [
        route.screen,
      ]) as AppScreen[],
    }));
}

export function getAdminSidebarItems() {
  return ROUTE_ENTRIES.filter(
    (r) =>
      (r.parent === "workspaceAdmin" || r.screen === "workspaceAdmin") && r.nav,
  )
    .sort((a, b) => (a.nav?.order ?? 99) - (b.nav?.order ?? 99))
    .map((route) => ({
      screen: route.screen,
      label: route.nav!.label,
      icon: route.nav!.icon,
    }));
}

export function getScreensInGroup(group: RouteGroup): AppScreen[] {
  return ROUTE_ENTRIES.filter((r) => r.group === group).map((r) => r.screen);
}
