import {
  Building2,
  Target,
  Activity,
  CheckCircle2,
  Vote,
  TrendingUp,
  TrendingDown,
  CalendarClock,
  MessageSquareQuote,
  Wand2,
  Sparkle,
} from "lucide-react";

import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { cn } from "@/lib/cn";
import type { WorkspaceInsights, WorkspaceStats } from "@sprintjam/types";

interface StatCardsProps {
  stats: WorkspaceStats | null;
  insights: WorkspaceInsights | null;
  teamCount?: number;
  sessionCount?: number;
  onOpenSessions?: () => void;
  onCreateRoom?: () => void;
  onCreateStandup?: () => void;
  onOpenWheel?: () => void;
}

function TrendIndicator({
  value,
  suffix = "%",
}: {
  value: number | null;
  suffix?: string;
}) {
  if (value === null) return null;

  const isPositive = value >= 50;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-amber-600 dark:text-amber-400";

  return (
    <span className={`flex items-center gap-0.5 text-xs ${colorClass}`}>
      <Icon className="h-3 w-3" />
      {Math.round(value)}
      {suffix}
    </span>
  );
}

function QuickAction({
  label,
  description,
  icon,
  onClick,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-3 text-left transition dark:border-white/10 dark:bg-slate-900/50",
        onClick
          ? "hover:border-brand-300 hover:bg-white dark:hover:border-brand-400/40 dark:hover:bg-slate-900"
          : "cursor-default opacity-60",
      )}
    >
      <span className="rounded-lg bg-slate-100 p-2 text-brand-600 dark:bg-slate-950/70 dark:text-brand-300">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900 dark:text-white">
          {label}
        </span>
        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
          {description}
        </span>
      </span>
    </button>
  );
}

export function StatCards({
  stats,
  insights,
  teamCount,
  sessionCount,
  onOpenSessions,
  onCreateRoom,
  onCreateStandup,
  onOpenWheel,
}: StatCardsProps) {
  const statCards = [
    {
      label: "Teams",
      value: stats?.totalTeams ?? teamCount ?? 0,
      icon: <Building2 className="h-5 w-5 text-brand-500" />,
      trend: null,
    },
    {
      label: "Sessions",
      value: stats?.totalSessions ?? sessionCount ?? 0,
      icon: <Target className="h-5 w-5 text-indigo-500" />,
      trend: null,
    },
    ...(stats
      ? [
        {
          label: "Planning",
          value: stats.sessionTypeCounts.planning,
          icon: <Target className="h-5 w-5 text-indigo-500" />,
          trend: null,
        },
        {
          label: "Standups",
          value: stats.sessionTypeCounts.standup,
          icon: (
            <MessageSquareQuote className="h-5 w-5 text-emerald-500" />
          ),
          trend: null,
        },
        {
          label: "Retros",
          value: 0,
          icon: <Sparkle className="h-5 w-5 text-amber-500" />,
          trend: null,
        },
        {
          label: "Wheels",
          value: stats.sessionTypeCounts.wheel,
          icon: <Wand2 className="h-5 w-5 text-amber-500" />,
          trend: null,
        },
      ]
      : []),
    {
      label: "Active",
      value: stats?.activeSessions ?? 0,
      icon: <Activity className="h-5 w-5 text-emerald-500" />,
      trend: null,
    },
    {
      label: "Completed",
      value: stats?.completedSessions ?? 0,
      icon: <CheckCircle2 className="h-5 w-5 text-amber-500" />,
      trend: null,
    },
  ];

  const insightCards = insights
    ? [
        {
          label: "Total votes",
          value: insights.totalVotes.toLocaleString(),
          icon: <Vote className="h-5 w-5 text-violet-500" />,
          trend: insights.participationRate,
          trendLabel: "participation",
        },
        {
          label: "Consensus rate",
          value: `${Math.round(insights.firstRoundConsensusRate)}%`,
          icon: <CheckCircle2 className="h-5 w-5 text-teal-500" />,
          trend: insights.firstRoundConsensusRate,
          trendLabel: "first round",
        },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <SurfaceCard
            key={stat.label}
            variant="subtle"
            className="flex items-center justify-between"
          >
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                {stat.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                {stat.value ?? "—"}
              </p>
            </div>
            <div className="rounded-2xl bg-white/70 p-2 dark:bg-slate-900/40">
              {stat.icon}
            </div>
          </SurfaceCard>
        ))}
      </div>
      {insightCards.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {insightCards.map((stat) => (
            <SurfaceCard
              key={stat.label}
              variant="subtle"
              className="flex items-center justify-between"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                    {stat.value}
                  </p>
                  <TrendIndicator value={stat.trend} />
                </div>
              </div>
              <div className="rounded-2xl bg-white/70 p-2 dark:bg-slate-900/40">
                {stat.icon}
              </div>
            </SurfaceCard>
          ))}
        </div>
      )}
      <SurfaceCard variant="subtle" className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Quick actions
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickAction
            label="Sessions"
            description="Review saved and active work"
            icon={<CalendarClock className="h-4 w-4" />}
            onClick={onOpenSessions}
          />
          <QuickAction
            label="Planning room"
            description="Estimate backlog items"
            icon={<Target className="h-4 w-4" />}
            onClick={onCreateRoom}
          />
          <QuickAction
            label="Standup"
            description="Collect updates and blockers"
            icon={<MessageSquareQuote className="h-4 w-4" />}
            onClick={onCreateStandup}
          />
          <QuickAction
            label="Wheel"
            description="Pick speakers or reviewers"
            icon={<Wand2 className="h-4 w-4" />}
            onClick={onOpenWheel}
          />
        </div>
      </SurfaceCard>
    </div>
  );
}
