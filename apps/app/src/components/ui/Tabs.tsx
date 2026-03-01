import type { ComponentProps } from "react";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";

import { cn } from "@/lib/cn";

type TabsRootProps = ComponentProps<typeof BaseTabs.Root>;

interface TabsListProps extends ComponentProps<typeof BaseTabs.List> {
  fullWidth?: boolean;
  showIndicator?: boolean;
}

type TabsTabProps = ComponentProps<typeof BaseTabs.Tab>;
type TabsIndicatorProps = ComponentProps<typeof BaseTabs.Indicator>;
type TabsPanelProps = ComponentProps<typeof BaseTabs.Panel>;

function composeClassName<State>(
  baseClassName: string,
  className?: string | ((state: State) => string | undefined),
) {
  if (typeof className === "function") {
    return (state: State) => cn(baseClassName, className(state));
  }

  return cn(baseClassName, className);
}

function Root({ className, ...props }: TabsRootProps) {
  return (
    <BaseTabs.Root
      className={composeClassName("space-y-6", className)}
      {...props}
    />
  );
}

function Indicator({ className, ...props }: TabsIndicatorProps) {
  return (
    <BaseTabs.Indicator
      renderBeforeHydration
      className={composeClassName(
        "absolute left-0 top-1 h-[calc(100%-0.5rem)] w-[var(--active-tab-width)] translate-x-[var(--active-tab-left)] rounded-2xl bg-white shadow-sm transition-[translate,width] duration-200 ease-out dark:bg-slate-800",
        className,
      )}
      {...props}
    />
  );
}

function List({
  className,
  children,
  fullWidth = false,
  showIndicator = true,
  ...props
}: TabsListProps) {
  return (
    <BaseTabs.List
      className={composeClassName(
        cn(
          "relative z-0 inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200/70 bg-slate-100/80 p-1 shadow-sm dark:border-white/10 dark:bg-slate-900/60",
          fullWidth ? "flex w-full" : "w-fit",
        ),
        className,
      )}
      {...props}
    >
      {children}
      {showIndicator ? <Indicator /> : null}
    </BaseTabs.List>
  );
}

function Tab({ className, ...props }: TabsTabProps) {
  return (
    <BaseTabs.Tab
      className={composeClassName(
        "relative z-[1] flex h-10 shrink-0 items-center justify-center rounded-2xl border-0 px-4 text-sm font-semibold whitespace-nowrap text-slate-500 outline-none transition-colors before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:outline before:outline-2 before:outline-brand-400/0 before:transition-[outline-color] hover:text-slate-700 focus-visible:before:outline-brand-400 data-[active]:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:data-[active]:text-white",
        className,
      )}
      {...props}
    />
  );
}

function Panel({ className, ...props }: TabsPanelProps) {
  return (
    <BaseTabs.Panel
      className={composeClassName(
        "outline-none focus-visible:rounded-2xl focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        className,
      )}
      {...props}
    />
  );
}

export const Tabs = {
  Root,
  List,
  Tab,
  Indicator,
  Panel,
};

export type {
  TabsIndicatorProps,
  TabsListProps,
  TabsPanelProps,
  TabsRootProps,
  TabsTabProps,
};
