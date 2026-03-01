import type { RoomSettings, JudgeAlgorithm } from "@/types";
import { Checkbox } from "@/components/ui/Checkbox";

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
          <Checkbox
            id="allowOthersToShowEstimates"
            checked={localSettings.allowOthersToShowEstimates}
            onCheckedChange={(checked) =>
              handleChange("allowOthersToShowEstimates", checked)
            }
            data-testid="settings-toggle-allow-show"
          />
          <label
            htmlFor="allowOthersToShowEstimates"
            className="ml-2 text-sm text-slate-700 dark:text-slate-300"
          >
            Allow others to show estimates
          </label>
        </div>
        <div className="flex items-center">
          <Checkbox
            id="allowOthersToDeleteEstimates"
            checked={localSettings.allowOthersToDeleteEstimates}
            onCheckedChange={(checked) =>
              handleChange("allowOthersToDeleteEstimates", checked)
            }
            data-testid="settings-toggle-allow-reset"
          />
          <label
            htmlFor="allowOthersToDeleteEstimates"
            className="ml-2 text-sm text-slate-700 dark:text-slate-300"
          >
            Allow others to delete estimates
          </label>
        </div>
        <div className="flex items-center">
          <Checkbox
            id="autoHandoverModerator"
            checked={localSettings.autoHandoverModerator || false}
            onCheckedChange={(checked) =>
              handleChange("autoHandoverModerator", checked)
            }
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
          <Checkbox
            id="hideParticipantNames"
            checked={localSettings.hideParticipantNames || false}
            onCheckedChange={(checked) =>
              handleChange("hideParticipantNames", checked)
            }
            data-testid="settings-toggle-hide-names"
          />
          <label
            htmlFor="hideParticipantNames"
            className="ml-2 text-sm text-slate-700 dark:text-slate-300"
          >
            Hide participant names
          </label>
        </div>
        <div className="flex items-center">
          <Checkbox
            id="showUserPresence"
            checked={localSettings.showUserPresence}
            onCheckedChange={(checked) =>
              handleChange("showUserPresence", checked)
            }
            data-testid="settings-toggle-show-presence"
          />
          <label
            htmlFor="showUserPresence"
            className="ml-2 text-sm text-slate-700 dark:text-slate-300"
          >
            Show user presence
          </label>
        </div>
        <div className="flex items-center">
          <Checkbox
            id="anonymousVotes"
            checked={localSettings.anonymousVotes}
            onCheckedChange={(checked) =>
              handleChange("anonymousVotes", checked)
            }
            data-testid="settings-toggle-anonymous-votes"
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
