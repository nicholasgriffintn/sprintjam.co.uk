import type { RoomSettings, JudgeAlgorithm } from '@/types';
import { useJiraOAuth } from '@/hooks/useJiraOAuth';
import { useLinearOAuth } from '@/hooks/useLinearOAuth';
import { useGithubOAuth } from '@/hooks/useGithubOAuth';
import { BetaBadge } from '@/components/BetaBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

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
  const {
    status: githubStatus,
    loading: githubLoading,
    error: githubError,
    connect: githubConnect,
    disconnect: githubDisconnect,
  } = useGithubOAuth();

  const autoSyncEnabled = localSettings.autoSyncEstimates ?? true;
  const handleAutoSyncToggle = (checked: boolean) => {
    handleChange('autoSyncEstimates', checked);
  };
  const externalServiceOptions = [
    { label: 'None', value: 'none' },
    { label: 'Jira', value: 'jira' },
    { label: 'Linear', value: 'linear' },
    { label: 'GitHub', value: 'github' },
  ];
  const jiraFieldOptions = [
    { label: 'Select a field', value: '' },
    ...fields.map((field) => ({
      label: `${field.name}${field.type ? ` (${field.type})` : ''}`,
      value: field.id,
    })),
  ];
  const renderAutoSyncToggle = (
    provider: 'jira' | 'linear',
    connected: boolean
  ) => {
    if (!connected) return null;
    const providerLabel = provider === 'jira' ? 'Jira' : 'Linear';

    return (
      <div className="flex items-center pt-3">
        <input
          type="checkbox"
          id="autoSyncEstimates"
          checked={autoSyncEnabled}
          onChange={(e) => handleAutoSyncToggle(e.target.checked)}
          data-testid="settings-toggle-auto-sync"
          className="h-4 w-4 rounded border-white/50 text-brand-600 focus:ring-brand-500 dark:border-white/10"
        />
        <label
          htmlFor="autoSyncEstimates"
          className="ml-2 text-sm text-slate-700 dark:text-slate-300"
        >
          Auto-sync estimates to {providerLabel} when voting completes
        </label>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          Ticket Queue <BetaBadge />
        </p>
      </div>
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

      {localSettings.enableTicketQueue && (
        <div className="space-y-2">
          <Input
            type="number"
            label="Sprint capacity (points)"
            placeholder="40"
            min={0}
            value={
              localSettings.capacityPoints === null ||
              localSettings.capacityPoints === undefined
                ? ''
                : String(localSettings.capacityPoints)
            }
            onChange={(event) => {
              const next = event.target.value;
              handleChange(
                'capacityPoints',
                next === '' ? null : Number(next),
              );
            }}
            fullWidth
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Optional. Track estimated points against sprint capacity.
          </p>
        </div>
      )}

      {localSettings.enableTicketQueue && (
        <div className="pt-2">
          <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            External Integration
          </h3>
          <div className="space-y-3">
            <label
              htmlFor="externalService"
              className="text-sm text-slate-700 dark:text-slate-300"
            >
              Provider
            </label>
            <Select
              id="externalService"
              value={localSettings.externalService || 'none'}
              onValueChange={(value) => handleChange('externalService', value)}
              data-testid="settings-select-external-service"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              options={externalServiceOptions}
            />
            {localSettings.externalService === 'jira' && (
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
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
                        <Button
                          onClick={jiraDisconnect}
                          disabled={jiraLoading}
                          variant="unstyled"
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Connect your Jira account to fetch and update tickets
                      </p>
                      <Button
                        onClick={jiraConnect}
                        disabled={jiraLoading}
                        variant="unstyled"
                        className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                      >
                        Connect to Jira
                      </Button>
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
                    {renderAutoSyncToggle('jira', !!jiraStatus.connected)}
                    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            Field configuration
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Choose which Jira fields to use for story points and
                            sprint.
                          </p>
                        </div>
                        <Button
                          onClick={fetchFields}
                          disabled={fieldsLoading}
                          variant="unstyled"
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200 disabled:opacity-50"
                        >
                          {fieldsLoading
                            ? 'Refreshing…'
                            : fieldsLoaded
                            ? 'Refresh'
                            : 'Load fields'}
                        </Button>
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
                            <Select
                              id="jiraStoryPointsField"
                              value={jiraStatus.storyPointsField ?? ''}
                              onValueChange={(value) =>
                                saveFieldConfiguration({
                                  storyPointsField: value || null,
                                })
                              }
                              disabled={savingFields || fields.length === 0}
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                              options={jiraFieldOptions}
                            />
                          </div>

                          <div className="space-y-1">
                            <label
                              htmlFor="jiraSprintField"
                              className="text-sm text-slate-700 dark:text-slate-300"
                            >
                              Sprint field
                            </label>
                            <Select
                              id="jiraSprintField"
                              value={jiraStatus.sprintField ?? ''}
                              onValueChange={(value) =>
                                saveFieldConfiguration({
                                  sprintField: value || null,
                                })
                              }
                              disabled={savingFields || fields.length === 0}
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                              options={jiraFieldOptions}
                            />
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
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
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
                        <Button
                          onClick={linearDisconnect}
                          disabled={linearLoading}
                          variant="unstyled"
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Connect your Linear account to sync estimates.
                      </p>
                      <Button
                        onClick={linearConnect}
                        disabled={linearLoading}
                        variant="unstyled"
                        className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                      >
                        Connect to Linear
                      </Button>
                    </div>
                  )}
                  {linearError && (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                      {linearError}
                    </p>
                  )}
                </div>

                {renderAutoSyncToggle(
                  'linear',
                  linearStatus.connected ?? false
                )}
              </div>
            )}
            {localSettings.externalService === 'github' && (
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                  {githubLoading ? (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Loading connection status...
                    </p>
                  ) : githubStatus.connected ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            ✓ Connected to GitHub
                          </p>
                          {(githubStatus.defaultOwner ||
                            githubStatus.defaultRepo) && (
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              Repo:{' '}
                              {[
                                githubStatus.defaultOwner,
                                githubStatus.defaultRepo,
                              ]
                                .filter(Boolean)
                                .join('/')}
                            </p>
                          )}
                          {githubStatus.githubLogin && (
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {githubStatus.githubLogin}
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={githubDisconnect}
                          disabled={githubLoading}
                          variant="unstyled"
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Connect your GitHub account to sync estimates.
                      </p>
                      <Button
                        onClick={githubConnect}
                        disabled={githubLoading}
                        variant="unstyled"
                        className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                      >
                        Connect to GitHub
                      </Button>
                    </div>
                  )}
                  {githubError && (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                      {githubError}
                    </p>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
