import type { RoomSettings, JudgeAlgorithm } from "../../types";
import { useJiraOAuth } from "../../hooks/useJiraOAuth";

export function OtherOptions({
  localSettings,
  handleChange,
}: {
  localSettings: RoomSettings;
  handleChange: (
    key: keyof RoomSettings,
    value: boolean | (string | number)[] | JudgeAlgorithm | number | string,
  ) => void;
}) {
  const {
    status,
    loading,
    error,
    connect,
    disconnect,
    fields,
    fieldsLoading,
    fieldsLoaded,
    fetchFields,
    saveFieldConfiguration,
    savingFields,
  } = useJiraOAuth();
  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 dark:text-white mb-2 select-none flex items-center gap-2">
        <span className="inline-block transition-transform group-open:rotate-90">
          ▶
        </span>
        Other Options
      </summary>
      <div className="mb-4">
        <div className="space-y-3 rounded-2xl border border-white/50 bg-white/60 dark:border-white/10 dark:bg-slate-900/40 p-4">
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
              </select>
              {localSettings.externalService === 'jira' && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800/50">
                    {loading ? (
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Loading connection status...
                      </p>
                    ) : status.connected ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              ✓ Connected to Jira
                            </p>
                            {status.jiraDomain && (
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                {status.jiraDomain}
                              </p>
                            )}
                            {status.jiraUserEmail && (
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                {status.jiraUserEmail}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={disconnect}
                            disabled={loading}
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
                          onClick={connect}
                          disabled={loading}
                          className="w-full px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition disabled:opacity-50"
                        >
                          Connect to Jira
                        </button>
                      </div>
                    )}
                    {error && (
                      <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                        {error}
                      </p>
                    )}
                  </div>

                  {status.connected && (
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
                              Choose which Jira fields to use for story points and sprint.
                            </p>
                          </div>
                          <button
                            onClick={fetchFields}
                            disabled={fieldsLoading}
                            className="text-xs px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900/40 disabled:opacity-50"
                          >
                            {fieldsLoading ? 'Refreshing…' : fieldsLoaded ? 'Refresh' : 'Load fields'}
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
                                value={status.storyPointsField ?? ''}
                                onChange={(e) =>
                                  saveFieldConfiguration({
                                    storyPointsField:
                                      e.target.value || null,
                                  })
                                }
                                disabled={savingFields || fields.length === 0}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                              >
                                <option value="">Select a field</option>
                                {fields.map((field) => (
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
                                value={status.sprintField ?? ''}
                                onChange={(e) =>
                                  saveFieldConfiguration({
                                    sprintField: e.target.value || null,
                                  })
                                }
                                disabled={savingFields || fields.length === 0}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                              >
                                <option value="">Select a field</option>
                                {fields.map((field) => (
                                  <option key={field.id} value={field.id}>
                                    {field.name}
                                    {field.type ? ` (${field.type})` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {!status.storyPointsField && (
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
            </div>

            <div className="pt-2">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Permissions
              </h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allowOthersToShowEstimates"
                    checked={localSettings.allowOthersToShowEstimates}
                    onChange={(e) =>
                      handleChange(
                        'allowOthersToShowEstimates',
                        e.target.checked
                      )
                    }
                    data-testid="settings-toggle-allow-show"
                    className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-white/50 dark:border-white/10 rounded"
                  />
                  <label
                    htmlFor="allowOthersToShowEstimates"
                    className="ml-2 text-sm text-slate-700 dark:text-slate-300"
                  >
                    Allow others to show estimates
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allowOthersToDeleteEstimates"
                    checked={localSettings.allowOthersToDeleteEstimates}
                    onChange={(e) =>
                      handleChange(
                        'allowOthersToDeleteEstimates',
                        e.target.checked
                      )
                    }
                    data-testid="settings-toggle-allow-reset"
                    className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-white/50 dark:border-white/10 rounded"
                  />
                  <label
                    htmlFor="allowOthersToDeleteEstimates"
                    className="ml-2 text-sm text-slate-700 dark:text-slate-300"
                  >
                    Allow others to delete estimates
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoHandoverModerator"
                    checked={localSettings.autoHandoverModerator || false}
                    onChange={(e) =>
                      handleChange('autoHandoverModerator', e.target.checked)
                    }
                    className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-white/50 dark:border-white/10 rounded"
                  />
                  <label
                    htmlFor="autoHandoverModerator"
                    className="ml-2 text-sm text-slate-700 dark:text-slate-300"
                  >
                    Auto handover moderator when they leave
                  </label>
                </div>
              </div>
            </div>
            <div className="pt-2">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Display Options
              </h3>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hideParticipantNames"
                  checked={localSettings.hideParticipantNames || false}
                  onChange={(e) =>
                    handleChange('hideParticipantNames', e.target.checked)
                  }
                  data-testid="settings-toggle-hide-names"
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-white/50 dark:border-white/10 rounded"
                />
                <label
                  htmlFor="hideParticipantNames"
                  className="ml-2 text-sm text-slate-700 dark:text-slate-300"
                >
                  Hide participant names
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showTimer"
                  checked={localSettings.showTimer}
                  onChange={(e) => handleChange('showTimer', e.target.checked)}
                  data-testid="settings-toggle-show-timer"
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-white/50 dark:border-white/10 rounded"
                />
                <label
                  htmlFor="showTimer"
                  className="ml-2 text-sm text-slate-700 dark:text-slate-300"
                >
                  Show timer
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showUserPresence"
                  checked={localSettings.showUserPresence}
                  onChange={(e) =>
                    handleChange('showUserPresence', e.target.checked)
                  }
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-white/50 dark:border-white/10 rounded"
                />
                <label
                  htmlFor="showUserPresence"
                  className="ml-2 text-sm text-slate-700 dark:text-slate-300"
                >
                  Show user presence
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showAverage"
                  checked={localSettings.showAverage}
                  onChange={(e) =>
                    handleChange('showAverage', e.target.checked)
                  }
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-white/50 dark:border-white/10 rounded"
                />
                <label
                  htmlFor="showAverage"
                  className="ml-2 text-sm text-slate-700 dark:text-slate-300"
                >
                  Show average
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showMedian"
                  checked={localSettings.showMedian}
                  onChange={(e) => handleChange('showMedian', e.target.checked)}
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-white/50 dark:border-white/10 rounded"
                />
                <label
                  htmlFor="showMedian"
                  className="ml-2 text-sm text-slate-700 dark:text-slate-300"
                >
                  Show median
                </label>
              </div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showTopVotes"
                    checked={localSettings.showTopVotes}
                    onChange={(e) =>
                      handleChange('showTopVotes', e.target.checked)
                    }
                    className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-white/50 dark:border-white/10 rounded"
                  />
                  <label
                    htmlFor="showTopVotes"
                    className="ml-2 text-sm text-slate-700 dark:text-slate-300"
                  >
                    Show top votes
                  </label>
                </div>
                {localSettings.showTopVotes && (
                  <div className="ml-6">
                    <label
                      htmlFor="topVotesCount"
                      className="block text-sm text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Number of top votes to show
                    </label>
                    <input
                      id="topVotesCount"
                      type="number"
                      min="1"
                      max="10"
                      value={localSettings.topVotesCount}
                      onChange={(e) =>
                        handleChange(
                          'topVotesCount',
                          parseInt(e.target.value) || 1
                        )
                      }
                      className="w-20 rounded-2xl border border-white/50 bg-white/80 px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-900"
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="anonymousVotes"
                  checked={localSettings.anonymousVotes}
                  onChange={(e) =>
                    handleChange('anonymousVotes', e.target.checked)
                  }
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-white/50 dark:border-white/10 rounded"
                />
                <label
                  htmlFor="anonymousVotes"
                  className="ml-2 text-sm text-slate-700 dark:text-slate-300"
                >
                  Anonymous votes
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </details>
  );
}
