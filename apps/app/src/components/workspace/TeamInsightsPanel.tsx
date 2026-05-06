import {
  BarChart3,
  TrendingUp,
} from "lucide-react";

import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { SuggestedFocusCards } from "@/components/workspace/SuggestedFocusCards";
import { CeremonyCountStrip } from "@/components/workspace/InsightActivitySummary";
import {
  buildPlanningInsightMetrics,
  buildStandupInsightMetrics,
} from "@/components/workspace/workspaceInsightMetrics";
import { buildInsightPrompts } from "@/utils/workspace-insight-prompts";
import type { TeamInsights, TeamSessionCounts } from "@sprintjam/types";

interface TeamInsightsPanelProps {
  teamName: string;
  insights: TeamInsights | null;
  sessionCounts?: TeamSessionCounts;
}

function MetricCard({
  label,
  value,
  icon,
  description,
  color,
  bgColor,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
      <div
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${bgColor} ${color}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-lg font-semibold text-slate-900 dark:text-white">
          {value}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
          {description}
        </p>
      </div>
    </div>
  );
}

export function TeamInsightsPanel({
  teamName,
  insights,
  sessionCounts,
}: TeamInsightsPanelProps) {
  if (!insights) {
    return (
      <SurfaceCard>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Team insights
            </h3>
          </div>
          {sessionCounts ? (
            <CeremonyCountStrip counts={sessionCounts} label="Linked sessions" />
          ) : null}
          <p className="text-sm text-slate-600 dark:text-slate-300">
            No completed insights available for {teamName}. Complete planning
            sessions, standups, or wheels to build team history.
          </p>
        </div>
      </SurfaceCard>
    );
  }

  const metrics = buildPlanningInsightMetrics(insights, {
    includeParticipation: true,
    discussionDescription: "Tickets needing discussion",
    velocityDescription: "Tickets per hour",
    uncertaintyDescription: '"?" votes cast',
  });
  const standupMetrics = buildStandupInsightMetrics(insights.standup);
  const hasPlanningRounds = insights.totalRounds > 0;
  const hasStandupInsights = insights.standup.sessionsAnalyzed > 0;
  const prompts = buildInsightPrompts(insights);

  return (
    <SurfaceCard>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-500" />
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Team insights
            </h3>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {insights.sessionsAnalyzed} sessions · {insights.totalRounds}{" "}
            planning rounds
          </span>
        </div>

        <CeremonyCountStrip counts={insights.sessionTypeCounts} />

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Planning signals
          </h4>
          {hasPlanningRounds ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {metrics.map((metric) => (
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
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Standup signals
          </h4>
          {hasStandupInsights ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

        {prompts.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/40">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Suggested focus
            </h4>
            <SuggestedFocusCards prompts={prompts} />
          </div>
        ) : null}

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {insights.totalTickets > 0
              ? `${insights.totalTickets} tickets estimated`
              : "No planning tickets estimated yet"}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Based on last {insights.sessionsAnalyzed} completed sessions
          </span>
        </div>
      </div>
    </SurfaceCard>
  );
}
