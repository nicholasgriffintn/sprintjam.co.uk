import type { FC } from "react";
import { motion } from "framer-motion";
import { Share2, Settings } from "lucide-react";

import { useWheelHeaderOptional } from "@/context/WheelHeaderContext";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { HeaderLogo } from "../HeaderLogo";
import DarkModeToggle from "../DarkModeToggle";
import { HEADER_TRANSITION } from "@/constants";
import { HeaderUserMenu } from "../HeaderUserMenu";
import { useSessionActions } from "@/context/SessionContext";
import { BetaBadge } from '@/components/BetaBadge';

export const WheelHeader: FC = () => {
  const wheelHeader = useWheelHeaderOptional();
  const { goHome } = useSessionActions();

  if (!wheelHeader || !wheelHeader.wheelKey) {
    return null;
  }

  const { wheelKey, setIsShareModalOpen, setIsSettingsModalOpen } = wheelHeader;

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
        <div className="flex items-center gap-2 text-sm">
          <div className="flex h-9 items-stretch overflow-hidden rounded-2xl border border-black/5 bg-black/5 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white">
            <div
              className="flex items-center px-2 font-mono text-xs tracking-widest sm:px-3 sm:text-sm"
              data-testid="wheel-key-value"
            >
              {wheelKey}
            </div>
            <Button
              type="button"
              variant="unstyled"
              onClick={() => setIsShareModalOpen(true)}
              aria-label="Share wheel"
              className="border-l border-black/5 px-2 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:border-white/10 dark:text-brand-200 hover:dark:text-brand-100 sm:px-3"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </div>
        </div>
        <BetaBadge />
      </motion.div>

      <motion.div
        className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={HEADER_TRANSITION}
      >
        <DarkModeToggle />
        <Button
          type="button"
          variant="unstyled"
          onClick={() => setIsSettingsModalOpen(true)}
          aria-label="Wheel settings"
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-brand-700 shadow-sm transition hover:border-brand-200 hover:text-brand-600 focus-visible:ring-brand-300 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:border-brand-300/60 dark:hover:text-brand-100',
            'md:w-auto md:min-w-[3rem] md:gap-2 md:px-4',
          )}
        >
          <Settings className="h-4 w-4" />
          <span className="hidden text-sm font-semibold md:inline">
            Settings
          </span>
        </Button>

        <HeaderUserMenu />
      </motion.div>
    </>
  );
};
