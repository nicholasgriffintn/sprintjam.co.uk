import {
  Building2,
  Target,
  Activity,
  CheckCircle2,
  Vote,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

import { SurfaceCard } from '@/components/ui/SurfaceCard';
import type {
  WorkspaceStats,
  WorkspaceInsights,
} from '@/lib/workspace-service';

interface StatCardsProps {
  stats: WorkspaceStats | null;
  insights: WorkspaceInsights | null;
  teamCount?: number;
  sessionCount?: number;
}

function TrendIndicator({
  value,
  suffix = '%',
}: {
  value: number | null;
  suffix?: string;
}) {
  if (value === null) return null;

  const isPositive = value >= 50;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-amber-600 dark:text-amber-400';

  return (
    <span className={`flex items-center gap-0.5 text-xs ${colorClass}`}>
      <Icon className="h-3 w-3" />
      {Math.round(value)}
      {suffix}
    </span>
  );
}

export function StatCards({ stats, insights }: StatCardsProps) {
  const statCards = [
    {
      label: 'Teams',
      value: stats?.totalTeams ?? 0,
      icon: <Building2 className="h-5 w-5 text-brand-500" />,
      trend: null,
    },
    {
      label: 'Sessions',
      value: stats?.totalSessions ?? 0,
      icon: <Target className="h-5 w-5 text-indigo-500" />,
      trend: null,
    },
    {
      label: 'Active',
      value: stats?.activeSessions ?? 0,
      icon: <Activity className="h-5 w-5 text-emerald-500" />,
      trend: null,
    },
    {
      label: 'Completed',
      value: stats?.completedSessions ?? 0,
      icon: <CheckCircle2 className="h-5 w-5 text-amber-500" />,
      trend: null,
    },
  ];

  const insightCards = insights
    ? [
        {
          label: 'Total votes',
          value: insights.totalVotes.toLocaleString(),
          icon: <Vote className="h-5 w-5 text-violet-500" />,
          trend: insights.participationRate,
          trendLabel: 'participation',
        },
        {
          label: 'Consensus rate',
          value: `${Math.round(insights.firstRoundConsensusRate)}%`,
          icon: <CheckCircle2 className="h-5 w-5 text-teal-500" />,
          trend: insights.firstRoundConsensusRate,
          trendLabel: 'first round',
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
                {stat.value ?? '—'}
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
    </div>
  );
}
