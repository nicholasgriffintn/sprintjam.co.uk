import { useEffect, useState } from 'react';
import {
    BarChart3,
    MessageSquare,
    Target,
    Users,
    Zap,
} from 'lucide-react';

import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Spinner } from '@/components/ui/Spinner';
import { getSessionStats, isAuthenticated } from '@/lib/workspace-service';
import type { SessionStats } from '@sprintjam/types';

interface RoomStatsPanelProps {
    roomKey: string;
}

function formatVelocity(v: number | null): string {
    if (v === null) return '—';
    if (v >= 10) return `${Math.round(v)}/hr`;
    return `${v.toFixed(1)}/hr`;
}

export function RoomStatsPanel({ roomKey }: RoomStatsPanelProps) {
    const [stats, setStats] = useState<SessionStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function fetchStats() {
            try {
                const authed = await isAuthenticated();
                if (!authed || cancelled) {
                    setIsLoading(false);
                    return;
                }

                setIsVisible(true);
                const data = await getSessionStats(roomKey);
                if (!cancelled) {
                    setStats(data);
                }
            } catch {
                // Not available — hide the panel silently
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        fetchStats();
        return () => {
            cancelled = true;
        };
    }, [roomKey]);

    if (!isVisible) return null;

    if (isLoading) {
        return (
            <SurfaceCard padding="md">
                <div className="flex items-center justify-center py-4">
                    <Spinner size="sm" />
                </div>
            </SurfaceCard>
        );
    }

    if (!stats) return null;

    const metrics = [
        {
            label: 'Consensus rate',
            value: `${Math.round(stats.firstRoundConsensusRate)}%`,
            icon: <Target className="h-4 w-4" />,
            color: 'text-emerald-600 dark:text-emerald-400',
            bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
        },
        {
            label: 'Discussion rate',
            value: `${Math.round(stats.discussionRate)}%`,
            icon: <MessageSquare className="h-4 w-4" />,
            color: 'text-amber-600 dark:text-amber-400',
            bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        },
        {
            label: 'Velocity',
            value: formatVelocity(stats.estimationVelocity),
            icon: <Zap className="h-4 w-4" />,
            color: 'text-violet-600 dark:text-violet-400',
            bgColor: 'bg-violet-50 dark:bg-violet-900/20',
        },
        {
            label: 'Participation',
            value: `${Math.round(stats.participationRate)}%`,
            icon: <Users className="h-4 w-4" />,
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        },
    ];

    return (
        <SurfaceCard padding="md" className="space-y-3">
            <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-brand-500" />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Session insights
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                {metrics.map((metric) => (
                    <div
                        key={metric.label}
                        className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50"
                    >
                        <div
                            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${metric.bgColor} ${metric.color}`}
                        >
                            {metric.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {metric.label}
                            </p>
                            <p className="text-lg font-semibold text-slate-900 dark:text-white">
                                {metric.value}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                    {stats.totalRounds} rounds · {stats.totalVotes} votes
                </span>
                {stats.durationMinutes != null && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        {stats.durationMinutes < 60
                            ? `${Math.round(stats.durationMinutes)}m`
                            : `${Math.floor(stats.durationMinutes / 60)}h ${Math.round(stats.durationMinutes % 60)}m`}
                    </span>
                )}
            </div>
        </SurfaceCard>
    );
}
