import type { RoomSettings, JudgeAlgorithm } from "../../types";

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
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoUpdateJiraStoryPoints"
                    checked={localSettings.autoUpdateJiraStoryPoints || false}
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
