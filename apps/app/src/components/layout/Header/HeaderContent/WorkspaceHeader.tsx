import type { FC } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

import { useSessionActions, useSessionState } from "@/context/SessionContext";
import {
  getWorkspaceNavItems,
  navigateTo,
  type AppScreen,
} from "@/config/routes";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { HeaderLogo } from "../HeaderLogo";
import DarkModeToggle from "../DarkModeToggle";
import { HEADER_TRANSITION } from "@/constants";
import { HeaderUserMenu } from "../HeaderUserMenu";

export const WorkspaceHeader: FC = () => {
  const { screen } = useSessionState();
  const { goHome, startCreateFlow, setScreen } = useSessionActions();
  const navItems = getWorkspaceNavItems();

  const handleNavigate = (targetScreen: AppScreen) => {
    setScreen(targetScreen);
    navigateTo(targetScreen);
  };

  return (
    <>
      <motion.div
        className="flex items-center gap-2 sm:gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={HEADER_TRANSITION}
      >
        <HeaderLogo
          size="sm"
          showText
          onClick={goHome}
          className="flex-shrink-0 [&_span]:hidden [&_span]:sm:inline"
          layoutId="app-header-logo"
        />
        <div className="hidden sm:flex items-center gap-2 text-sm">
          {navItems.map((item) => {
            const isActive = item.activeForScreens.includes(screen);
            const Icon = item.icon;

            return (
              <button
                key={item.screen}
                type="button"
                onClick={() => handleNavigate(item.screen)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white",
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={HEADER_TRANSITION}
      >
        <Button
          type="button"
          variant="unstyled"
          onClick={startCreateFlow}
          aria-label="Create room"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-slate-600 shadow-sm transition hover:border-brand-200 hover:text-brand-600 focus-visible:ring-brand-300 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:border-brand-300/60 dark:hover:text-brand-100",
            "md:w-auto md:min-w-[3rem] md:gap-2 md:px-4",
          )}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden text-sm font-semibold md:inline">
            New Room
          </span>
          <span className="text-sm font-semibold md:hidden">New</span>
        </Button>

        <DarkModeToggle />

        <HeaderUserMenu />
      </motion.div>
    </>
  );
};
