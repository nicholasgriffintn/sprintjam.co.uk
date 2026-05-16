import { useEffect, useState, type FC } from "react";
import { CheckCircle2, Copy, Users } from "lucide-react";
import { motion } from "framer-motion";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BetaBadge } from "@/components/BetaBadge";
import { useRetroHeaderOptional } from "@/context/RetroHeaderContext";
import { useSessionActions } from "@/context/SessionContext";
import { HEADER_TRANSITION } from "@/constants";
import DarkModeToggle from "./DarkModeToggle";
import { HeaderLogo } from "./HeaderLogo";
import { HeaderUserMenu } from "./HeaderUserMenu";

function toLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const RetroHeader: FC = () => {
  const header = useRetroHeaderOptional();
  const { goHome } = useSessionActions();
  const [isCopied, setIsCopied] = useState(false);

  const retroKey = header?.retroKey ?? null;
  const phase = header?.phase ?? null;
  const status = header?.status ?? null;
  const participantCount = header?.participantCount ?? 0;

  useEffect(() => {
    if (!isCopied) return;
    const timeout = window.setTimeout(() => setIsCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [isCopied]);

  const handleCopy = async () => {
    if (!retroKey) return;
    await navigator.clipboard.writeText(
      `${window.location.origin}/retro/join/${retroKey}`,
    );
    setIsCopied(true);
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
        {retroKey ? (
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl border border-black/5 bg-black/5 px-3 py-2 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white">
              <span
                data-testid="retro-room-key"
                className="font-mono text-xs tracking-[0.3em] sm:text-sm"
              >
                {retroKey}
              </span>
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
              {isCopied ? "Copied" : "Copy link"}
            </Button>
          </div>
        ) : null}
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
