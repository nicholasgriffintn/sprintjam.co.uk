import { Vote, Clock, Users } from "lucide-react";

import { SurfaceCard } from "@/components/ui/SurfaceCard";

interface OrgInsights {
  totalVotes: number;
  avgSessionDuration: number;
  teamsActive: number;
}

interface InsightsGridProps {
  insights: OrgInsights | null;
}

export function InsightsGrid({ insights }: InsightsGridProps) {
  if (!insights) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-800/50">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          No insights available yet
        </p>
      </div>
    );
  }

  const metricCards = [
    {
      label: "Total votes",
      value: insights.totalVotes.toLocaleString(),
      icon: <Vote className="h-4 w-4" />,
      description: "Across all sessions",
    },
    {
      label: "Avg session duration",
      value: `${insights.avgSessionDuration} min`,
      icon: <Clock className="h-4 w-4" />,
      description: "Typical session length",
    },
    {
      label: "Teams active",
      value: insights.teamsActive,
      icon: <Users className="h-4 w-4" />,
      description: "Currently using workspace",
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-300">
        Organisation insights
      </h3>
      <div className="grid gap-3 sm:grid-cols-1">
        {metricCards.map((metric) => (
          <SurfaceCard key={metric.label} variant="subtle" padding="sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">
                {metric.icon}
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {metric.label}
                </p>
                <p className="text-xl font-semibold text-slate-900 dark:text-white">
                  {metric.value}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {metric.description}
                </p>
              </div>
            </div>
          </SurfaceCard>
        ))}
      </div>
    </div>
  );
}
