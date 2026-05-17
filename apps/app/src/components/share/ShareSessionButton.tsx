import type { ReactNode } from "react";
import { Share2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

interface ShareSessionButtonProps {
  sessionKey: string;
  keyTestId: string;
  shareLabel: string;
  onShare: () => void;
  children?: ReactNode;
  className?: string;
}

export function ShareSessionButton({
  sessionKey,
  keyTestId,
  shareLabel,
  onShare,
  children,
  className,
}: ShareSessionButtonProps) {
  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <div className="flex h-9 items-stretch overflow-hidden rounded-2xl border border-black/5 bg-black/5 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white">
        <div className="flex min-w-0 items-center gap-2 px-2 sm:px-3">
          <span
            data-testid={keyTestId}
            className="font-mono text-xs tracking-widest sm:text-sm"
          >
            {sessionKey}
          </span>
          {children}
        </div>
        <Button
          type="button"
          variant="unstyled"
          onClick={onShare}
          aria-label={shareLabel}
          className="border-l border-black/5 px-2 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:border-white/10 dark:text-brand-200 hover:dark:text-brand-100 sm:px-3"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Share</span>
        </Button>
      </div>
    </div>
  );
}
