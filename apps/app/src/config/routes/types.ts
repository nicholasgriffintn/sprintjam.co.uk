import type { FC, LazyExoticComponent, ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { MetaTagConfig } from "@/utils/meta";
import type { PageBackgroundVariant } from "@/components/layout/PageBackground";
import type {
  HeaderVariant,
  MarketingVariant,
} from "@/components/layout/Header/types";

export type RouteGroup =
  | "marketing"
  | "workspace"
  | "room"
  | "wheel"
  | "standup"
  | "auth"
  | "flow";

export interface RoutePathParams {
  roomKey?: string;
  wheelKey?: string;
  standupKey?: string;
}

export interface RouteNavConfig {
  label: string;
  icon?: LucideIcon;
  order?: number;
  activeForScreens?: string[];
}

export interface RouteLayoutConfig {
  background?: PageBackgroundVariant;
  header?: HeaderVariant;
  marketingVariant?: MarketingVariant;
}

export interface RouteDefinition<TScreen extends string = string> {
  screen: TScreen;
  path: string | ((params: RoutePathParams) => string);
  group: RouteGroup;
  meta: MetaTagConfig;
  nav?: RouteNavConfig;
  layout?: RouteLayoutConfig;
  pathPattern?: RegExp;
  parent?: TScreen;
}

export interface RouteConfig<TScreen extends string = string>
  extends RouteDefinition<TScreen> {
  component: FC | LazyExoticComponent<ComponentType<unknown>>;
}

export type ScreenFromRoutes<T extends readonly RouteDefinition[]> =
  T[number]["screen"];
