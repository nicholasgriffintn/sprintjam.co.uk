import { TrendingUp } from "lucide-react";

import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { CeremonyCountStrip } from "@/components/workspace/InsightActivitySummary";
import {
  buildPlanningInsightMetrics,
  buildStandupInsightMetrics,
  buildWheelInsightMetrics,
  type WorkspaceInsightMetric,
} from "@/components/workspace/workspaceInsightMetrics";
import type { WorkspaceInsights } from "@sprintjam/types";

interface InsightsGridProps {
  insights: WorkspaceInsights | null;
}

function MetricCard({
  label,
  value,
  icon,
  description,
  color,
  bgColor,
}: WorkspaceInsightMetric) {
  return (
    <SurfaceCard variant="subtle" padding="sm">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${bgColor} ${color}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-lg font-semibold leading-none text-slate-900 dark:text-white">
            {value}
          </p>
          <p className="mt-1 text-xs leading-snug text-slate-400 dark:text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </SurfaceCard>
  );
}

export function InsightsGrid({ insights }: InsightsGridProps) {
  if (!insights) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Collaboration Insights
          </h3>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          No insights available yet
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Complete some sessions to see collaboration metrics
        </p>
      </div>
    );
  }

  const collaborationMetrics = buildPlanningInsightMetrics(insights, {
    discussionDescription: "Tickets needing multiple rounds",
    velocityDescription: "Tickets estimated per hour",
    uncertaintyDescription: '"?" votes indicating uncertainty',
  });
  const hasPlanningRounds = insights.totalRounds > 0;
  const hasStandupInsights = insights.standup.sessionsAnalyzed > 0;
  const hasWheelInsights = insights.wheel.sessionsAnalyzed > 0;
  const standupMetrics = buildStandupInsightMetrics(insights.standup);
  const wheelMetrics = buildWheelInsightMetrics(insights.wheel);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Collaboration Insights
          </h3>
        </div>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {insights.sessionsAnalyzed} sessions analysed
        </span>
      </div>

      <div className="space-y-4">
        <CeremonyCountStrip counts={insights.sessionTypeCounts} />

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-500 dark:text-slate-300">
            Planning signals
          </h4>
          {hasPlanningRounds ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {collaborationMetrics.map((metric) => (
                <MetricCard key={metric.label} {...metric} />
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
              Planning-specific metrics appear after a linked planning room
              completes.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-500 dark:text-slate-300">
            Standup signals
          </h4>
          {hasStandupInsights ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {standupMetrics.map((metric) => (
                <MetricCard key={metric.label} {...metric} />
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
              Standup-specific metrics appear after a linked standup room
              completes.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-500 dark:text-slate-300">
            Wheel signals
          </h4>
          {hasWheelInsights ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {wheelMetrics.map((metric) => (
                <MetricCard key={metric.label} {...metric} />
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
              Wheel-specific metrics appear after a linked wheel room records a
              spin.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
