import type { FC } from "react";
import { motion } from "framer-motion";
import { Settings, LogOut, HelpCircle } from "lucide-react";

import { useRoomActions, useRoomState } from "@/context/RoomContext";
import { useRoomHeaderOptional } from "@/context/RoomHeaderContext";
import { Button } from "@/components/ui/Button";
import { ShareSessionButton } from "@/components/share/ShareSessionButton";
import { cn } from "@/lib/cn";
import { HeaderLogo } from "../HeaderLogo";
import { HEADER_TRANSITION } from "@/constants";
import { HeaderUserMenu } from "../HeaderUserMenu";
import { useSessionActions } from "@/context/SessionContext";

export const RoomHeader: FC = () => {
  const { roomData, isModeratorView } = useRoomState();
  const roomHeader = useRoomHeaderOptional();
  const { goHome } = useSessionActions();
  const { handleLeaveRoom } = useRoomActions();

  if (!roomData || !roomHeader) {
    return null;
  }

  const {
    setIsShareModalOpen,
    openSettings,
    isHelpPanelOpen,
    setIsHelpPanelOpen,
  } = roomHeader;

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
        <ShareSessionButton
          sessionKey={roomData.key}
          keyTestId="room-key-value"
          shareLabel="Share room"
          onShare={() => setIsShareModalOpen(true)}
        />
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
          onClick={() => setIsHelpPanelOpen(!isHelpPanelOpen)}
          aria-label="Room help"
          aria-expanded={isHelpPanelOpen}
          aria-controls="room-help-panel"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/70 text-slate-600 shadow-sm transition hover:border-brand-200 hover:text-brand-600 focus-visible:ring-brand-300 dark:border-white/15 dark:bg-white/10 dark:text-slate-100 dark:hover:border-brand-300/60 dark:hover:text-brand-100",
            "md:w-auto md:min-w-[3rem] md:gap-2 md:px-4",
          )}
        >
          <HelpCircle className="h-4 w-4" />
          <span className="hidden text-sm font-semibold md:inline">Help</span>
        </Button>
        {isModeratorView && (
          <Button
            type="button"
            variant="unstyled"
            onClick={() => openSettings()}
            aria-label="Room settings"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/70 text-brand-700 shadow-sm transition hover:border-brand-200 hover:text-brand-600 focus-visible:ring-brand-300 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:border-brand-300/60 dark:hover:text-brand-100",
              "md:w-auto md:min-w-[3rem] md:gap-2 md:px-4",
            )}
          >
            <Settings className="h-4 w-4" />
            <span className="hidden text-sm font-semibold md:inline">
              Settings
            </span>
          </Button>
        )}
        <Button
          type="button"
          variant="unstyled"
          onClick={handleLeaveRoom ?? undefined}
          aria-label="Leave room"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/40 text-rose-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800 focus-visible:ring-rose-200 dark:border-rose-500/40 dark:bg-rose-500/5 dark:text-rose-200 dark:hover:border-rose-400 dark:hover:bg-rose-500/15 dark:hover:text-rose-100",
            "md:w-auto md:min-w-[3rem] md:gap-2 md:px-4",
          )}
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden text-sm font-semibold md:inline">
            Leave room
          </span>
        </Button>

        <HeaderUserMenu />
      </motion.div>
    </>
  );
};
