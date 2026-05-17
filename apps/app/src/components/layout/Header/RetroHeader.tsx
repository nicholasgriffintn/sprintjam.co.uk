import type { FC } from "react";
import { Users } from "lucide-react";
import { motion } from "framer-motion";

import { Badge } from "@/components/ui/Badge";
import { BetaBadge } from "@/components/BetaBadge";
import { ShareSessionButton } from "@/components/share/ShareSessionButton";
import { useRetroHeaderOptional } from "@/context/RetroHeaderContext";
import { useSessionActions } from "@/context/SessionContext";
import { HEADER_TRANSITION } from "@/constants";
import { HeaderLogo } from "./HeaderLogo";
import { HeaderUserMenu } from "./HeaderUserMenu";

function toLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const RetroHeader: FC = () => {
  const header = useRetroHeaderOptional();
  const { goHome } = useSessionActions();

  const retroKey = header?.retroKey ?? null;
  const phase = header?.phase ?? null;
  const status = header?.status ?? null;
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
        <BetaBadge />
        {retroKey ? (
          <ShareSessionButton
            sessionKey={retroKey}
            keyTestId="retro-room-key"
            shareLabel="Share retro"
            onShare={() => header?.setIsShareModalOpen(true)}
          >
            {phase ? (
              <Badge
                variant={status === "completed" ? "default" : "info"}
                size="sm"
              >
                {toLabel(status === "completed" ? status : phase)}
              </Badge>
            ) : null}
            {participantCount > 0 ? (
              <span className="hidden items-center gap-1 text-xs text-slate-500 sm:inline-flex dark:text-slate-300">
                <Users className="h-3.5 w-3.5" />
                {participantCount}
              </span>
            ) : null}
          </ShareSessionButton>
        ) : null}
      </motion.div>
      <motion.div
        className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={HEADER_TRANSITION}
      >
        <HeaderUserMenu />
      </motion.div>
    </>
  );
};
