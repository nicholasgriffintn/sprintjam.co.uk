import { useState, useEffect } from "react";
import {
  Target,
  MessageSquare,
  Zap,
  HelpCircle,
  BarChart3,
  Users,
  TrendingUp,
} from "lucide-react";

import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Spinner } from "@/components/ui/Spinner";
import type { TeamInsights } from "@sprintjam/types";
import { getTeamInsights } from "@/lib/workspace-service";

interface TeamInsightsPanelProps {
  teamId: number;
  teamName: string;
}

function formatVelocity(velocity: number | null): string {
  if (velocity === null) return "—";
  if (velocity >= 10) return `${Math.round(velocity)}/hr`;
  return `${velocity.toFixed(1)}/hr`;
}

function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
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
  teamId,
  teamName,
}: TeamInsightsPanelProps) {
  const [insights, setInsights] = useState<TeamInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchInsights() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getTeamInsights(teamId);
        setInsights(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to fetch team insights"),
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchInsights();
  }, [teamId]);

  if (isLoading) {
    return (
      <SurfaceCard>
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" />
        </div>
      </SurfaceCard>
    );
  }

  if (error) {
    return (
      <SurfaceCard>
        <div className="py-8 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Failed to load team insights
          </p>
        </div>
      </SurfaceCard>
    );
  }

  if (!insights) {
    return (
      <SurfaceCard>
        <div className="py-8 text-center">
          <BarChart3 className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500" />
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            No insights available for {teamName}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Complete some sessions to see collaboration metrics
          </p>
        </div>
      </SurfaceCard>
    );
  }

  const metrics = [
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
      description: "Tickets needing discussion",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      label: "Estimation velocity",
      value: formatVelocity(insights.estimationVelocity),
      icon: <Zap className="h-4 w-4" />,
      description: "Tickets per hour",
      color: "text-violet-600 dark:text-violet-400",
      bgColor: "bg-violet-50 dark:bg-violet-900/20",
    },
    {
      label: "Participation rate",
      value: formatPercentage(insights.participationRate),
      icon: <Users className="h-4 w-4" />,
      description: "Average per round",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "Uncertainty rate",
      value: formatPercentage(insights.questionMarkRate),
      icon: <HelpCircle className="h-4 w-4" />,
      description: '"?" votes cast',
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-slate-100 dark:bg-slate-700",
    },
  ];

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
            {insights.sessionsAnalyzed} sessions · {insights.totalRounds} rounds
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {insights.totalTickets} tickets estimated
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Based on last {insights.sessionsAnalyzed} completed sessions
          </span>
        </div>
      </div>
    </SurfaceCard>
  );
}
