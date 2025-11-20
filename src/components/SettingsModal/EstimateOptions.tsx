import type { RoomSettings } from "../../types";

export function EstimateOptions({
  localSettings,
  defaultSettings,
  structuredVotingOptions,
  estimateOptionsInput,
  handleEstimateOptionsChange,
}: {
  localSettings: RoomSettings;
  defaultSettings: RoomSettings;
  structuredVotingOptions: (string | number)[];
  estimateOptionsInput: string;
  handleEstimateOptionsChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor="estimateOptions"
        className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
      >
        Estimate Options
      </label>
      <input
        id="estimateOptions"
        type="text"
        value={
          localSettings.enableStructuredVoting
            ? structuredVotingOptions
                .map((option) => option.toString())
                .join(",")
            : estimateOptionsInput
        }
        onChange={(e) => handleEstimateOptionsChange(e.target.value)}
        placeholder={`e.g., ${defaultSettings.estimateOptions
          .map((option) => option.toString())
          .join(",")}`}
        disabled={localSettings.enableStructuredVoting}
        className={`w-full rounded-2xl border border-white/50 bg-white/80 px-4 py-2.5 text-base text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-brand-400 dark:focus:ring-brand-900 ${
          localSettings.enableStructuredVoting
            ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
            : ""
        }`}
      />
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {localSettings.enableStructuredVoting
          ? "Fixed options for structured voting"
          : "Separate values with commas"}
      </p>
    </div>
  );
}
