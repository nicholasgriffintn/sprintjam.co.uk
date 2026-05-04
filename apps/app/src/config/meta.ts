import { ROUTE_DEFINITIONS, type AppScreen } from "@/config/routes/definitions";
import type { MetaTagConfig } from "@/utils/meta";

export const META_CONFIGS = Object.fromEntries(
  ROUTE_DEFINITIONS.map((route) => [route.screen, route.meta]),
) as Record<AppScreen, MetaTagConfig>;

function isAppScreen(screen: string): screen is AppScreen {
  return screen in META_CONFIGS;
}

export function getMetaConfig(screen: AppScreen | string): MetaTagConfig {
  return isAppScreen(screen) ? META_CONFIGS[screen] : META_CONFIGS.welcome;
}
