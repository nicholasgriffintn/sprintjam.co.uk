import type { RoomSettings, JudgeAlgorithm } from "@/types";
import { Switch } from "@/components/ui/Switch";

export function VotingMode({
  localSettings,
  handleChange,
}: {
  localSettings: RoomSettings;
  handleChange: (
    key: keyof RoomSettings,
    value: boolean | (string | number)[] | JudgeAlgorithm | number,
  ) => void;
}) {
  const isStructured = localSettings.enableStructuredVoting || false;

  return (
    <div>
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        Voting Mode
      </h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label
            htmlFor="enableStructuredVoting"
            className="text-sm text-slate-700 dark:text-slate-300"
          >
            Enable Structured Voting
          </label>
          <Switch
            id="enableStructuredVoting"
            checked={isStructured}
            onCheckedChange={(checked) =>
              handleChange("enableStructuredVoting", checked)
            }
            data-testid="settings-toggle-structured-voting"
          />
        </div>
        {isStructured && (
          <div className="bg-white/50 dark:bg-slate-800/50 p-3 rounded-2xl border border-white/50 dark:border-white/10">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Structured voting allows users to vote on multiple criteria with
              scores from 0-4. Story points are automatically calculated based
              on your estimate options using a Fibonacci scale.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
