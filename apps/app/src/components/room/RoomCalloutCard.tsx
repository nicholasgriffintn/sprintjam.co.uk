import type { FC } from "react";
import { motion } from "framer-motion";

import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";

interface RoomCalloutCardProps {
  badge: string;
  title: string;
  body: string;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}

export const RoomCalloutCard: FC<RoomCalloutCardProps> = ({
  badge,
  title,
  body,
  primaryAction,
  secondaryAction,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 8 }}
    transition={{ duration: 0.2 }}
  >
    <SurfaceCard padding="sm" variant="subtle" className="text-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {badge}
          </p>
          <p className="text-base font-semibold text-slate-900 dark:text-white">
            {title}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">{body}</p>
        </div>
        {(primaryAction || secondaryAction) && (
          <div className="flex flex-wrap gap-2 md:ml-auto">
            {primaryAction && (
              <Button
                type="button"
                variant="unstyled"
                onClick={primaryAction.onClick}
                className="flex-shrink-0 whitespace-nowrap rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow hover:bg-slate-800 focus-visible:ring-slate-400 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 dark:focus-visible:ring-white/60"
              >
                {primaryAction.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                type="button"
                variant="unstyled"
                onClick={secondaryAction.onClick}
                className="flex-shrink-0 whitespace-nowrap rounded-full border border-slate-200/70 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-900 focus-visible:ring-slate-300 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white dark:focus-visible:ring-white/30"
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </SurfaceCard>
  </motion.div>
);
