import { Building2, Target, Activity, CheckCircle2 } from "lucide-react";

import { SurfaceCard } from "@/components/ui/SurfaceCard";
import type { WorkspaceStats } from "@/lib/workspace-service";

interface StatCardsProps {
  stats: WorkspaceStats | null;
  teamCount?: number;
  sessionCount?: number;
}

export function StatCards({
  stats,
  teamCount = 0,
  sessionCount = 0,
}: StatCardsProps) {
  const statCards = [
    {
      label: "Teams",
      value: stats?.totalTeams ?? teamCount,
      icon: <Building2 className="h-5 w-5 text-brand-500" />,
    },
    {
      label: "Sessions",
      value: stats?.totalSessions ?? sessionCount,
      icon: <Target className="h-5 w-5 text-indigo-500" />,
    },
    {
      label: "Active",
      value: stats?.activeSessions ?? 0,
      icon: <Activity className="h-5 w-5 text-emerald-500" />,
    },
    {
      label: "Completed",
      value: stats?.completedSessions ?? 0,
      icon: <CheckCircle2 className="h-5 w-5 text-amber-500" />,
    },
  ];

  return (
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
  );
}
