import { useEffect, useState, type FC } from "react";
import { motion } from "framer-motion";
import { Copy, CheckCircle2, Users } from "lucide-react";

import { useStandupHeaderOptional } from "@/context/StandupHeaderContext";
import { useSessionActions } from "@/context/SessionContext";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeaderLogo } from "./HeaderLogo";
import DarkModeToggle from "./DarkModeToggle";
import { HeaderUserMenu } from "./HeaderUserMenu";
import { HEADER_TRANSITION } from "@/constants";
import { BetaBadge } from '../../BetaBadge';

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
  const [isCopied, setIsCopied] = useState(false);

  const standupKey = header?.standupKey ?? null;
  const standupStatus = header?.standupStatus ?? null;
  const respondedCount = header?.respondedCount ?? 0;
  const participantCount = header?.participantCount ?? 0;

  useEffect(() => {
    if (!isCopied) {
      return;
    }

    const timeout = window.setTimeout(() => setIsCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [isCopied]);

  const handleCopy = async () => {
    if (!standupKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/standup/join/${standupKey}`,
      );
      setIsCopied(true);
    } catch (error) {
      console.error("Failed to copy standup link:", error);
    }
  };

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

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {standupKey && (
            <>
              <div className="flex items-center gap-2 rounded-2xl border border-black/5 bg-black/5 px-3 py-2 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white">
                <span className="font-mono text-xs tracking-[0.3em] sm:text-sm">
                  {standupKey}
                </span>
                {standupStatus ? (
                  <Badge
                    variant={STATUS_BADGE_VARIANTS[standupStatus]}
                    size="sm"
                  >
                    {toStatusLabel(standupStatus)}
                  </Badge>
                ) : null}
                {participantCount > 0 ? (
                  <span className="hidden items-center gap-1 text-xs text-slate-500 sm:inline-flex dark:text-slate-300">
                    <Users className="h-3.5 w-3.5" />
                    {respondedCount}/{participantCount}
                  </span>
                ) : null}
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                icon={
                  isCopied ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )
                }
                className="hidden sm:inline-flex"
              >
                {isCopied ? 'Copied' : 'Copy link'}
              </Button>
            </>
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
