import { useEffect, useMemo, useState } from 'react';

import {
  fetchFixitLeaderboard,
  type FixitLeaderboardEntry,
} from '@/lib/fixits-service';
import { useFixitWebSocket } from '@/hooks/useFixitWebSocket';

interface FixitLeaderboardCardProps {
  fixitId: string | null | undefined;
  limit?: number;
}

type LeaderboardState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; entries: FixitLeaderboardEntry[] }
  | { status: 'error'; message: string };

export function FixitLeaderboardCard({
  fixitId,
  limit = 5,
}: FixitLeaderboardCardProps) {
  const [state, setState] = useState<LeaderboardState>({ status: 'idle' });

  const isEnabled = Boolean(fixitId);

  useEffect(() => {
    if (!fixitId) {
      setState({ status: 'idle' });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    fetchFixitLeaderboard({ fixitId, limit })
      .then((res) => {
        if (!cancelled) {
          setState({ status: 'ready', entries: res.entries ?? [] });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fixitId, limit]);

  useFixitWebSocket(
    isEnabled ? fixitId : null,
    (message) => {
      if (!message || typeof message !== 'object') return;
      if ('type' in (message as any)) {
        const payload = message as {
          type: string;
          entries?: FixitLeaderboardEntry[];
        };

        if (
          (payload.type === 'leaderboardUpdated' ||
            payload.type === 'leaderboardSnapshot') &&
          Array.isArray(payload.entries)
        ) {
          setState({ status: 'ready', entries: payload.entries });
        }
      }
    },
    { enabled: isEnabled }
  );

  const content = useMemo(() => {
    if (!fixitId) {
      return (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Select a Fixit run to track live leaderboard results.
        </p>
      );
    }

    if (state.status === 'loading' || state.status === 'idle') {
      return (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Loading Fixit leaderboard…
        </p>
      );
    }

    if (state.status === 'error') {
      return (
        <p className="text-sm text-rose-600 dark:text-rose-400">
          {state.message || 'Unable to load leaderboard'}
        </p>
      );
    }

    if (!state.entries.length) {
      return (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No Fixit activity recorded yet.
        </p>
      );
    }

    return (
      <ul className="space-y-2">
        {state.entries.slice(0, limit).map((entry, index) => (
          <li
            key={entry.user}
            className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 text-sm shadow-sm dark:bg-white/5"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                #{index + 1}
              </span>
              <span className="font-medium text-slate-800 dark:text-white">
                {entry.user}
              </span>
            </div>
            <div className="text-right">
              <div className="text-base font-semibold text-brand-600 dark:text-brand-300">
                {entry.points} pts
              </div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {entry.bugsClosed ?? 0} bugs · {entry.prsMerged ?? 0} PRs
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }, [fixitId, limit, state]);

  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="mb-3 flex items-center justify-between w-full">
        <div className="w-full">
          <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Fixit Leaderboard
          </p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            {fixitId || 'No run selected'}
          </p>
        </div>
      </div>
      {content}
    </div>
  );
}
