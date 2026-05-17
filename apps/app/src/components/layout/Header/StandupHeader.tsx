import type { FC } from "react";
import { motion } from "framer-motion";
import { Users } from "lucide-react";

import { useStandupHeaderOptional } from "@/context/StandupHeaderContext";
import { useSessionActions } from "@/context/SessionContext";
import { Badge } from "@/components/ui/Badge";
import { ShareSessionButton } from "@/components/share/ShareSessionButton";
import { HeaderLogo } from "./HeaderLogo";
import DarkModeToggle from "./DarkModeToggle";
import { HeaderUserMenu } from "./HeaderUserMenu";
import { HEADER_TRANSITION } from "@/constants";

const STATUS_BADGE_VARIANTS = {
  active: "success",
  locked: "warning",
  presenting: "info",
  completed: "default",
} as const;

const toStatusLabel = (status: string) =>
  status.charAt(0).toUpperCase() + status.slice(1);

export const StandupHeader: FC = () => {
  const header = useStandupHeaderOptional();
  const { goHome } = useSessionActions();

  const standupKey = header?.standupKey ?? null;
  const standupStatus = header?.standupStatus ?? null;
  const respondedCount = header?.respondedCount ?? 0;
  const participantCount = header?.participantCount ?? 0;

  return (
    <>
      <motion.div
        className="flex items-center gap-2 sm:gap-5"
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

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {standupKey && (
            <ShareSessionButton
              sessionKey={standupKey}
              keyTestId="standup-room-key"
              shareLabel="Share standup"
              onShare={() => header?.setIsShareModalOpen(true)}
            >
              {standupStatus ? (
                <Badge variant={STATUS_BADGE_VARIANTS[standupStatus]} size="sm">
                  {toStatusLabel(standupStatus)}
                </Badge>
              ) : null}
              {participantCount > 0 ? (
                <span className="hidden items-center gap-1 text-xs text-slate-500 sm:inline-flex dark:text-slate-300">
                  <Users className="h-3.5 w-3.5" />
                  {respondedCount}/{participantCount}
                </span>
              ) : null}
            </ShareSessionButton>
          )}
        </div>
      </motion.div>

      <motion.div
        className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={HEADER_TRANSITION}
      >
        <DarkModeToggle />
        <HeaderUserMenu />
      </motion.div>
    </>
  );
};
