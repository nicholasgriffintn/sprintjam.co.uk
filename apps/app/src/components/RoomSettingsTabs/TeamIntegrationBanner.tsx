export function TeamIntegrationBanner({
  label,
  connected,
  loading,
}: {
  label: string;
  connected: boolean;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Checking {label} connection…
        </p>
      </div>
    );
  }

  if (connected) {
    return (
      <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-3 dark:border-brand-800/50 dark:bg-brand-900/20">
        <p className="text-sm font-medium text-slate-900 dark:text-white">
          ✓ Using team {label} integration
        </p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Managed in workspace team settings.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {label} is not connected. Connect {label} in your workspace team
        settings to use this integration.
      </p>
    </div>
  );
}
