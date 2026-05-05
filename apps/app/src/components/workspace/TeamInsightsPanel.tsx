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
import { SuggestedFocusCards } from "@/components/workspace/SuggestedFocusCards";
import { formatVelocity } from "@/lib/formatters";
import { buildInsightPrompts } from "@/utils/workspace-insight-prompts";
import type { TeamInsights, TeamSessionCounts } from "@sprintjam/types";

interface TeamInsightsPanelProps {
  teamName: string;
  insights: TeamInsights | null;
  sessionCounts?: TeamSessionCounts;
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

function ToolCountStrip({ counts }: { counts: TeamSessionCounts }) {
  const items = [
    { label: "Planning", value: counts.planning },
    { label: "Standups", value: counts.standup },
    { label: "Wheels", value: counts.wheel },
  ];

  return (
    <div className="grid grid-cols-3 divide-x divide-slate-100 border-y border-slate-100 py-3 dark:divide-slate-800 dark:border-slate-800">
      {items.map((item) => (
        <div key={item.label} className="px-3 first:pl-0 last:pr-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {item.label}
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
            {item.value}
          </p>
        </div>
      ))}
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
          {sessionCounts ? <ToolCountStrip counts={sessionCounts} /> : null}
          <p className="text-sm text-slate-600 dark:text-slate-300">
            No planning insights available for {teamName}. Complete planning
            sessions, standups, and wheels to build team history.
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
            {insights.sessionsAnalyzed} sessions · {insights.totalRounds} rounds
          </span>
        </div>

        {sessionCounts ? <ToolCountStrip counts={sessionCounts} /> : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
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
