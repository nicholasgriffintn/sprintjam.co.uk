import {
  Users,
  Target,
  MessageSquare,
  Zap,
  HelpCircle,
  TrendingUp,
  Award,
} from "lucide-react";

import { SurfaceCard } from "@/components/ui/SurfaceCard";
import type { WorkspaceInsights } from "@sprintjam/types";

interface InsightsGridProps {
  insights: WorkspaceInsights | null;
}

function formatVelocity(velocity: number | null): string {
  if (velocity === null) return "—";
  if (velocity >= 10) return `${Math.round(velocity)}/hr`;
  return `${velocity.toFixed(1)}/hr`;
}

function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

export function InsightsGrid({ insights }: InsightsGridProps) {
  if (!insights) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-800/50">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-300">
          Collaboration insights
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          No insights available yet
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Complete some sessions to see collaboration metrics
        </p>
      </div>
    );
  }

  const collaborationMetrics = [
    {
      label: "First-round consensus",
      value: formatPercentage(insights.firstRoundConsensusRate),
      icon: <Target className="h-4 w-4" />,
      description: "Tickets agreed on first vote",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      label: "Discussion rate",
      value: formatPercentage(insights.discussionRate),
      icon: <MessageSquare className="h-4 w-4" />,
      description: "Tickets needing multiple rounds",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      label: "Estimation velocity",
      value: formatVelocity(insights.estimationVelocity),
      icon: <Zap className="h-4 w-4" />,
      description: "Tickets estimated per hour",
      color: "text-violet-600 dark:text-violet-400",
      bgColor: "bg-violet-50 dark:bg-violet-900/20",
    },
    {
      label: "Uncertainty rate",
      value: formatPercentage(insights.questionMarkRate),
      icon: <HelpCircle className="h-4 w-4" />,
      description: '"?" votes indicating uncertainty',
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-slate-100 dark:bg-slate-800",
    },
  ];

  const hasContributors = insights.topContributors.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-300">
          Collaboration insights
        </h3>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {insights.sessionsAnalyzed} sessions analysed
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {collaborationMetrics.map((metric) => (
          <SurfaceCard key={metric.label} variant="subtle" padding="sm">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${metric.bgColor} ${metric.color}`}
              >
                {metric.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {metric.label}
                </p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {metric.value}
                </p>
              </div>
            </div>
          </SurfaceCard>
        ))}
      </div>

      {hasContributors && (
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-4 w-4 text-amber-500" />
            <h4 className="text-sm font-medium text-slate-500 dark:text-slate-300">
              Top contributors
            </h4>
          </div>
          <div className="space-y-2">
            {insights.topContributors.slice(0, 5).map((contributor, index) => (
              <div
                key={contributor.userName}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-[120px]">
                    {contributor.userName}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {contributor.totalVotes} votes
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {Math.round(contributor.consensusAlignment)}% aligned
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
