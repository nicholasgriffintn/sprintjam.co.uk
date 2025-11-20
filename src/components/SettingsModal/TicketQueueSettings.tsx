import type { RoomSettings, JudgeAlgorithm } from '../../types';

export function TicketQueueSettings({
  localSettings,
  handleChange,
}: {
  localSettings: RoomSettings;
  handleChange: (
    key: keyof RoomSettings,
    value: boolean | (string | number)[] | JudgeAlgorithm | number
  ) => void;
}) {
  return (
    <details className="group">
      <summary className="mb-2 flex cursor-pointer select-none items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <span className="inline-block transition-transform group-open:rotate-90">
          ▶
        </span>
        Ticket Queue (Beta)
      </summary>
      <div className="mb-4">
        <div className="space-y-3 rounded-2xl border border-white/50 bg-white/60 p-4 dark:border-white/10 dark:bg-slate-900/40">
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enableTicketQueue"
                checked={localSettings.enableTicketQueue ?? false}
                onChange={(e) =>
                  handleChange('enableTicketQueue', e.target.checked)
                }
                data-testid="settings-toggle-enable-queue"
                className="h-4 w-4 rounded border-white/50 text-brand-600 focus:ring-brand-500 dark:border-white/10"
              />
              <label
                htmlFor="enableTicketQueue"
                className="ml-2 text-sm text-slate-700 dark:text-slate-300"
              >
                Enable ticket queue
              </label>
            </div>
            <p className="ml-6 text-xs text-slate-500 dark:text-slate-400">
              Keep track of tickets in a shared queue and move through them in
              order.
            </p>
          </div>

          {localSettings.enableTicketQueue && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="allowOthersToManageQueue"
                checked={localSettings.allowOthersToManageQueue ?? false}
                onChange={(e) =>
                  handleChange('allowOthersToManageQueue', e.target.checked)
                }
                data-testid="settings-toggle-allow-queue"
                className="h-4 w-4 rounded border-white/50 text-brand-600 focus:ring-brand-500 dark:border-white/10"
              />
              <label
                htmlFor="allowOthersToManageQueue"
                className="ml-2 text-sm text-slate-700 dark:text-slate-300"
              >
                Allow others to manage ticket queue
              </label>
            </div>
          )}
        </div>
      </div>
    </details>
  );
}
