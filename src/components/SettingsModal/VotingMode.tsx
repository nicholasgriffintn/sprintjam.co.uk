import type { RoomSettings, JudgeAlgorithm } from '../../types';

export function VotingMode({
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
    <div>
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        Voting Mode
      </h3>
      <div className="space-y-3">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="enableStructuredVoting"
            checked={localSettings.enableStructuredVoting || false}
            onChange={(e) =>
              handleChange('enableStructuredVoting', e.target.checked)
            }
            data-testid="settings-toggle-structured-voting"
            className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-white/50 dark:border-white/10 rounded"
          />
          <label
            htmlFor="enableStructuredVoting"
            className="ml-2 text-sm text-slate-700 dark:text-slate-300"
          >
            Enable Structured Voting
          </label>
        </div>
        {localSettings.enableStructuredVoting && (
          <div className="bg-white/50 dark:bg-slate-800/50 p-3 rounded-2xl border border-white/50 dark:border-white/10">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Structured voting allows users to vote on multiple criteria with
              scores from 0-4. Story points are automatically calculated based
              on your estimate options.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
