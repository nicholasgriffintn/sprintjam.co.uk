import type { RoomSettings, JudgeAlgorithm } from "@/types";

type HandleChange = (
  key: keyof RoomSettings,
  value: boolean | (string | number)[] | JudgeAlgorithm | number | string,
) => void;

function PermissionsSection({
  localSettings,
  handleChange,
}: {
  localSettings: RoomSettings;
  handleChange: HandleChange;
}) {
  return (
    <div className="pt-2">
      <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        Permissions
      </h3>
      <div className="space-y-2">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="allowOthersToShowEstimates"
            checked={localSettings.allowOthersToShowEstimates}
            onChange={(e) =>
              handleChange("allowOthersToShowEstimates", e.target.checked)
            }
            data-testid="settings-toggle-allow-show"
            className="h-4 w-4 rounded border-white/50 text-brand-600 focus:ring-brand-500 dark:border-white/10"
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
              handleChange("allowOthersToDeleteEstimates", e.target.checked)
            }
            data-testid="settings-toggle-allow-reset"
            className="h-4 w-4 rounded border-white/50 text-brand-600 focus:ring-brand-500 dark:border-white/10"
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
              handleChange("autoHandoverModerator", e.target.checked)
            }
            className="h-4 w-4 rounded border-white/50 text-brand-600 focus:ring-brand-500 dark:border-white/10"
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
  );
}

function PrivacySection({
  localSettings,
  handleChange,
}: {
  localSettings: RoomSettings;
  handleChange: HandleChange;
}) {
  return (
    <div className="pt-2">
      <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        Privacy & presence
      </h3>
      <div className="space-y-2">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="hideParticipantNames"
            checked={localSettings.hideParticipantNames || false}
            onChange={(e) =>
              handleChange("hideParticipantNames", e.target.checked)
            }
            data-testid="settings-toggle-hide-names"
            className="h-4 w-4 rounded border-white/50 text-brand-600 focus:ring-brand-500 dark:border-white/10"
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
            id="showUserPresence"
            checked={localSettings.showUserPresence}
            onChange={(e) => handleChange("showUserPresence", e.target.checked)}
            data-testid="settings-toggle-show-presence"
            className="h-4 w-4 rounded border-white/50 text-brand-600 focus:ring-brand-500 dark:border-white/10"
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
            id="anonymousVotes"
            checked={localSettings.anonymousVotes}
            onChange={(e) => handleChange("anonymousVotes", e.target.checked)}
            data-testid="settings-toggle-anonymous-votes"
            className="h-4 w-4 rounded border-white/50 text-brand-600 focus:ring-brand-500 dark:border-white/10"
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
  );
}

export function PermissionsOptions({
  localSettings,
  handleChange,
}: {
  localSettings: RoomSettings;
  handleChange: HandleChange;
}) {
  return (
    <div className="space-mb-3">
      <PermissionsSection
        localSettings={localSettings}
        handleChange={handleChange}
      />
      <PrivacySection
        localSettings={localSettings}
        handleChange={handleChange}
      />
    </div>
  );
}
