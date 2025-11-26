import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  RefreshCcw,
  Trash2,
  Save,
  Shield,
  Info,
} from 'lucide-react';

import { PageBackground } from '@/components/layout/PageBackground';
import { Button } from '@/components/ui/Button';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Input } from '@/components/ui/Input';
import { useSession } from '@/context/SessionContext';
import {
  createFixitRun,
  deleteFixitRun,
  fetchFixitRuns,
  updateFixitRun,
  type FixitRun,
} from '@/lib/fixits-service';
import { safeLocalStorage } from '@/utils/storage';
import { Footer } from '@/components/layout/Footer';
import { usePageMeta } from '@/hooks/usePageMeta';
import { META_CONFIGS } from '@/config/meta';
import { Logo } from '@/components/Logo';

const TOKEN_STORAGE_KEY = 'sprintjam_fixits_admin_token';

const FixitsAdminScreen = () => {
  const { goHome } = useSession();
  const [token, setToken] = useState(
    () => safeLocalStorage.get(TOKEN_STORAGE_KEY) ?? ''
  );
  const [runs, setRuns] = useState<FixitRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    fixitId: '',
    name: '',
    description: '',
  });

  usePageMeta(META_CONFIGS.fixitsAdmin);

  const canManage = Boolean(token?.trim());

  const loadRuns = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchFixitRuns({ includeInactive: true });
      setRuns(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load runs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRuns();
  }, []);

  const handleSaveToken = () => {
    safeLocalStorage.set(TOKEN_STORAGE_KEY, token);
  };

  const handleCreateRun = async () => {
    if (!canManage) {
      setError('Admin token required to create runs');
      return;
    }
    try {
      await createFixitRun(
        {
          fixitId: formState.fixitId.trim(),
          name: formState.name.trim(),
          description: formState.description.trim() || undefined,
        },
        token
      );
      setFormState({ fixitId: '', name: '', description: '' });
      await loadRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create run');
    }
  };

  const handleToggleActive = async (run: FixitRun) => {
    if (!canManage) {
      setError('Admin token required');
      return;
    }
    try {
      await updateFixitRun(run.fixitId, { isActive: !run.isActive }, token);
      await loadRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update run');
    }
  };

  const handleDelete = async (run: FixitRun) => {
    if (!canManage) {
      setError('Admin token required');
      return;
    }
    if (!window.confirm(`Delete fixit run ${run.fixitId}?`)) {
      return;
    }
    try {
      await deleteFixitRun(run.fixitId, token);
      await loadRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete run');
    }
  };

  const sortedRuns = useMemo(
    () =>
      [...runs].sort((a, b) => {
        if (a.isActive === b.isActive) {
          return (b.startDate ?? 0) - (a.startDate ?? 0);
        }
        return a.isActive ? -1 : 1;
      }),
    [runs]
  );

  return (
    <PageBackground maxWidth="xxl" variant="compact">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-10"
      >
        <div className="flex justify-center">
          <a href="/" aria-label="SprintJam home" className="hover:opacity-80">
            <Logo size="md" />
          </a>
        </div>
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.35em] text-brand-500">
              Fixits admin
            </p>
            <h1 className="text-2xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-4xl lg:text-4xl">
              Manage runs & leaderboards
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Provide your admin token and configure Fixit runs below.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div>
            <SurfaceCard className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-brand-500">
                  Create run
                </p>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  New Fixit run
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  IDs should match your GitHub labels (e.g.,{' '}
                  <code>2024-Q4</code>
                  ).
                </p>
              </div>
              <div className="text-left w-full">
                <Input
                  label="Fixit ID"
                  value={formState.fixitId}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      fixitId: e.target.value,
                    }))
                  }
                  placeholder="2024-Q4"
                  fullWidth
                />
                <Input
                  label="Name"
                  value={formState.name}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Q4 Bug Bash"
                  fullWidth
                />
                <Input
                  label="Description"
                  value={formState.description}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Optional context visible to participants"
                  fullWidth
                />
                <Button
                  onClick={handleCreateRun}
                  disabled={
                    !canManage ||
                    !formState.fixitId.trim() ||
                    !formState.name.trim()
                  }
                  className="mt-2"
                  fullWidth
                >
                  Create run
                </Button>
                {error && <p className="text-sm text-rose-500">{error}</p>}
              </div>
            </SurfaceCard>

            <SurfaceCard className="space-y-4 mt-6">
              <div className="text-left w-full">
                <Input
                  label="Admin token"
                  value={token}
                  type="password"
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="FIXITS_ADMIN_TOKEN or dev:test"
                  fullWidth
                />
                <Button
                  variant="ghost"
                  size="md"
                  onClick={handleSaveToken}
                  icon={<Save className="h-4 w-4" />}
                  className="mt-2"
                  fullWidth
                >
                  Save token locally
                </Button>
              </div>
            </SurfaceCard>
          </div>

          <SurfaceCard className="space-y-3">
            <div className="flex items-center justify-between w-full mb-2 pb-2">
              <div className="m-auto">
                <p className="text-xs uppercase tracking-[0.35em] text-brand-500">
                  Existing runs
                </p>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Active & inactive runs
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Activate a run to drive the Fixits leaderboard. Deleting is
                  permanent.
                </p>
                {isLoading && (
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    Loading…
                  </span>
                )}
              </div>
            </div>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2"></div>
              <Button
                variant="secondary"
                size="sm"
                onClick={loadRuns}
                icon={<RefreshCcw className="h-4 w-4" />}
              >
                Refresh
              </Button>
            </div>
            <div className="space-y-3">
              {sortedRuns.map((run) => (
                <div
                  key={run.fixitId}
                  className="rounded-2xl border border-white/40 bg-white/80 px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-left">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {run.name || run.fixitId}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {run.fixitId} · {run.isActive ? 'Active' : 'Inactive'}
                      </p>
                      {run.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {run.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={run.isActive ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => void handleToggleActive(run)}
                        disabled={!canManage}
                      >
                        {run.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDelete(run)}
                        disabled={!canManage}
                      >
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {!sortedRuns.length && !isLoading && (
                <p className="text-sm text-slate-500">
                  No runs configured yet. Create one using the form on the left.
                </p>
              )}
            </div>
          </SurfaceCard>
        </div>
      </motion.div>
      <Footer displayRepoLink={false} fullWidth={false} />
    </PageBackground>
  );
};

export default FixitsAdminScreen;
