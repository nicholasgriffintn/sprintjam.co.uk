import type { RoomSettings, JudgeAlgorithm } from "@/types";
import { Button } from "@/components/ui/Button";

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
          <Button
            type="button"
            variant="unstyled"
            role="switch"
            aria-checked={isStructured}
            id="enableStructuredVoting"
            onClick={() =>
              handleChange("enableStructuredVoting", !isStructured)
            }
            className={`relative inline-flex h-6 w-11 flex-shrink-0 justify-start rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:ring-brand-500 ${
              isStructured
                ? "bg-brand-600 dark:bg-brand-500"
                : "bg-slate-200 dark:bg-slate-700"
            }`}
            data-testid="settings-toggle-structured-voting"
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isStructured ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </Button>
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
