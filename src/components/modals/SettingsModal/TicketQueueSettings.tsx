import type { RoomSettings, JudgeAlgorithm } from "@/types";
import type { JiraFieldOption } from "@/lib/jira-service";
import { useJiraOAuth } from '@/hooks/useJiraOAuth';
import { useLinearOAuth } from '@/hooks/useLinearOAuth';

export function TicketQueueSettings({
  localSettings,
  handleChange,
}: {
  localSettings: RoomSettings;
  handleChange: (
    key: keyof RoomSettings,
    value:
      | boolean
      | (string | number)[]
      | JudgeAlgorithm
      | number
      | string
      | null
  ) => void;
}) {
  const {
    status: jiraStatus,
    loading: jiraLoading,
    error: jiraError,
    connect: jiraConnect,
    disconnect: jiraDisconnect,
    fields,
    fieldsLoading,
    fieldsLoaded,
    fetchFields,
    saveFieldConfiguration,
    savingFields,
  } = useJiraOAuth();

  const {
    status: linearStatus,
    loading: linearLoading,
    error: linearError,
    connect: linearConnect,
    disconnect: linearDisconnect,
  } = useLinearOAuth();

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

          <div className="pt-2">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              External Integration
            </h3>
            <div className="space-y-3">
              <label
                htmlFor="externalService"
                className="text-sm text-slate-700 dark:text-slate-300"
              >
                Provider
              </label>
              <select
                id="externalService"
                value={localSettings.externalService || 'none'}
                onChange={(e) =>
                  handleChange('externalService', e.target.value)
                }
                data-testid="settings-select-external-service"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="none">None</option>
                <option value="jira">Jira</option>
                <option value="linear">Linear</option>
              </select>
              {localSettings.externalService === 'jira' && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800/50">
                    {jiraLoading ? (
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Loading connection status...
                      </p>
                    ) : jiraStatus.connected ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              ✓ Connected to Jira
                            </p>
                            {jiraStatus.jiraDomain && (
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                {jiraStatus.jiraDomain}
                              </p>
                            )}
                            {jiraStatus.jiraUserEmail && (
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                {jiraStatus.jiraUserEmail}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={jiraDisconnect}
                            disabled={jiraLoading}
                            className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50"
                          >
                            Disconnect
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Connect your Jira account to fetch and update tickets
                        </p>
                        <button
                          onClick={jiraConnect}
                          disabled={jiraLoading}
                          className="w-full px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition disabled:opacity-50"
                        >
                          Connect to Jira
                        </button>
                      </div>
                    )}
                    {jiraError && (
                      <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                        {jiraError}
                      </p>
                    )}
                  </div>

                  {jiraStatus.connected && (
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="autoUpdateJiraStoryPoints"
                          checked={
                            localSettings.autoUpdateJiraStoryPoints || false
                          }
                          onChange={(e) =>
                            handleChange(
                              'autoUpdateJiraStoryPoints',
                              e.target.checked
                            )
                          }
                          data-testid="settings-toggle-jira-auto"
                          className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-white/50 dark:border-white/10 rounded"
                        />
                        <label
                          htmlFor="autoUpdateJiraStoryPoints"
                          className="ml-2 text-sm text-slate-700 dark:text-slate-300"
                        >
                          Auto-update story points in Jira when voting completes
                        </label>
                      </div>

                      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              Field configuration
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              Choose which Jira fields to use for story points
                              and sprint.
                            </p>
                          </div>
                          <button
                            onClick={fetchFields}
                            disabled={fieldsLoading}
                            className="text-xs px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900/40 disabled:opacity-50"
                          >
                            {fieldsLoading
                              ? 'Refreshing…'
                              : fieldsLoaded
                                ? 'Refresh'
                                : 'Load fields'}
                          </button>
                        </div>

                        {fieldsLoading ? (
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Loading fields from Jira…
                          </p>
                        ) : (
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label
                                htmlFor="jiraStoryPointsField"
                                className="text-sm text-slate-700 dark:text-slate-300"
                              >
                                Story points field
                              </label>
                              <select
                                id="jiraStoryPointsField"
                                value={jiraStatus.storyPointsField ?? ''}
                                onChange={(e) =>
                                  saveFieldConfiguration({
                                    storyPointsField: e.target.value || null,
                                  })
                                }
                                disabled={savingFields || fields.length === 0}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                              >
                                <option value="">Select a field</option>
                                {fields.map((field: JiraFieldOption) => (
                                  <option key={field.id} value={field.id}>
                                    {field.name}
                                    {field.type ? ` (${field.type})` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label
                                htmlFor="jiraSprintField"
                                className="text-sm text-slate-700 dark:text-slate-300"
                              >
                                Sprint field
                              </label>
                              <select
                                id="jiraSprintField"
                                value={jiraStatus.sprintField ?? ''}
                                onChange={(e) =>
                                  saveFieldConfiguration({
                                    sprintField: e.target.value || null,
                                  })
                                }
                                disabled={savingFields || fields.length === 0}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                              >
                                <option value="">Select a field</option>
                                {fields.map((field: JiraFieldOption) => (
                                  <option key={field.id} value={field.id}>
                                    {field.name}
                                    {field.type ? ` (${field.type})` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {!jiraStatus.storyPointsField && (
                              <p className="text-xs text-amber-700 dark:text-amber-400">
                                Story points field is required for auto-updates.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {localSettings.externalService === 'linear' && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800/50">
                    {linearLoading ? (
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Loading connection status...
                      </p>
                    ) : linearStatus.connected ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              ✓ Connected to Linear
                            </p>
                            {linearStatus.linearOrganizationId && (
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                Org: {linearStatus.linearOrganizationId}
                              </p>
                            )}
                            {linearStatus.linearUserEmail && (
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                {linearStatus.linearUserEmail}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={linearDisconnect}
                            disabled={linearLoading}
                            className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50"
                          >
                            Disconnect
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Connect your Linear account to sync estimates.
                        </p>
                        <button
                          onClick={linearConnect}
                          disabled={linearLoading}
                          className="w-full px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition disabled:opacity-50"
                        >
                          Connect to Linear
                        </button>
                      </div>
                    )}
                    {linearError && (
                      <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                        {linearError}
                      </p>
                    )}
                  </div>

                  {linearStatus.connected && (
                    <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-xs text-purple-800 dark:border-purple-700 dark:bg-purple-900/20 dark:text-purple-100">
                      Estimate field: {linearStatus.estimateField || 'Team default'}
                      <br />
                      Field selection UI is coming soon—using your team default for now.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </details>
  );
}
