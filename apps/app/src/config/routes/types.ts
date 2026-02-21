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
  | "auth"
  | "flow";

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

export interface RouteConfig<TScreen extends string = string> {
  screen: TScreen;
  path: string | ((params: { roomKey?: string; wheelKey?: string }) => string);
  group: RouteGroup;
  component: FC | LazyExoticComponent<ComponentType<unknown>>;
  meta: MetaTagConfig;
  nav?: RouteNavConfig;
  layout?: RouteLayoutConfig;
  pathPattern?: RegExp;
  parent?: TScreen;
}

export type ScreenFromRoutes<T extends readonly RouteConfig[]> =
  T[number]["screen"];
