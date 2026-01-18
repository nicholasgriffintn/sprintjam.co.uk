import { motion } from "framer-motion";
import { Users, TrendingUp, Vote, Target } from "lucide-react";

import { SurfaceCard } from "@/components/ui/SurfaceCard";

interface Contributor {
  userName: string;
  totalVotes: number;
  participationRate: number;
  consensusAlignment: number;
}

interface MemberContributionChartProps {
  contributors: Contributor[];
  title?: string;
  maxDisplay?: number;
}

export function MemberContributionChart({
  contributors,
  title = "Team contributions",
  maxDisplay = 8,
}: MemberContributionChartProps) {
  if (contributors.length === 0) {
    return (
      <SurfaceCard>
        <div className="py-8 text-center">
          <Users className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500" />
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            No contribution data yet
          </p>
        </div>
      </SurfaceCard>
    );
  }

  const displayContributors = contributors.slice(0, maxDisplay);
  const maxVotes = Math.max(...displayContributors.map((c) => c.totalVotes), 1);

  return (
    <SurfaceCard>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {title}
          </h3>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {contributors.length} participants
          </span>
        </div>

        <div className="space-y-3">
          {displayContributors.map((contributor, index) => {
            const percentage = (contributor.totalVotes / maxVotes) * 100;
            const isHighConsensus = contributor.consensusAlignment >= 70;

            return (
              <div key={contributor.userName} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-[140px]">
                      {contributor.userName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs flex-shrink-0">
                    <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      <Vote className="h-3 w-3" />
                      {contributor.totalVotes}
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        isHighConsensus
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      <Target className="h-3 w-3" />
                      {Math.round(contributor.consensusAlignment)}%
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{
                      duration: 0.6,
                      delay: 0.05 * index,
                      ease: "easeOut",
                    }}
                    className={`h-full rounded-full ${
                      isHighConsensus
                        ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                        : "bg-gradient-to-r from-brand-400 to-brand-500"
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {contributors.length > maxDisplay && (
          <p className="text-xs text-center text-slate-400 dark:text-slate-500 pt-2">
            +{contributors.length - maxDisplay} more participants
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
            <span>70%+ consensus alignment</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>Sorted by votes</span>
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}
