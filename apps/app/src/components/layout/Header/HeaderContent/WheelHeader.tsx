import type { FC } from "react";
import { motion } from "framer-motion";
import { Settings } from "lucide-react";

import { useWheelHeaderOptional } from "@/context/WheelHeaderContext";
import { Button } from "@/components/ui/Button";
import { ShareSessionButton } from "@/components/share/ShareSessionButton";
import { cn } from "@/lib/cn";
import { HeaderLogo } from "../HeaderLogo";
import DarkModeToggle from "../DarkModeToggle";
import { HEADER_TRANSITION } from "@/constants";
import { HeaderUserMenu } from "../HeaderUserMenu";
import { useSessionActions } from "@/context/SessionContext";

export const WheelHeader: FC = () => {
  const wheelHeader = useWheelHeaderOptional();
  const { goHome } = useSessionActions();

  if (!wheelHeader) {
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

        {wheelKey ? (
          <ShareSessionButton
            sessionKey={wheelKey}
            keyTestId="wheel-key-value"
            shareLabel="Share wheel"
            onShare={() => setIsShareModalOpen(true)}
          />
        ) : null}
      </motion.div>

      {wheelKey ? (
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
              "flex h-9 w-9 items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-brand-700 shadow-sm transition hover:border-brand-200 hover:text-brand-600 focus-visible:ring-brand-300 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:border-brand-300/60 dark:hover:text-brand-100",
              "md:w-auto md:min-w-[3rem] md:gap-2 md:px-4",
            )}
          >
            <Settings className="h-4 w-4" />
            <span className="hidden text-sm font-semibold md:inline">
              Settings
            </span>
          </Button>

          <HeaderUserMenu />
        </motion.div>
      ) : null}
    </>
  );
};
