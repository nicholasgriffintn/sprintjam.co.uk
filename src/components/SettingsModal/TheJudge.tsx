import type { RoomSettings, JudgeAlgorithm } from "../../types";

export function TheJudge({
  localSettings,
  handleChange,
}: {
  localSettings: RoomSettings;
  handleChange: (
    key: keyof RoomSettings,
    value: boolean | (string | number)[] | JudgeAlgorithm | number,
  ) => void;
}) {
  return (
    <div className="pt-2">
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        The Judge
      </h3>
      <div className="space-y-3">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="enableJudge"
            checked={localSettings.enableJudge}
            onChange={(e) => handleChange("enableJudge", e.target.checked)}
            className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-white/50 dark:border-white/10 rounded"
          />
          <label
            htmlFor="enableJudge"
            className="ml-2 text-sm text-slate-700 dark:text-slate-300"
          >
            Enable The Judge (permanent member that decides the best score)
          </label>
        </div>
        {localSettings.enableJudge && (
          <div className="ml-6">
            <label
              htmlFor="judgeAlgorithm"
              className="block text-sm text-slate-700 dark:text-slate-300 mb-1"
            >
              Algorithm
            </label>
            <select
              id="judgeAlgorithm"
              value={localSettings.judgeAlgorithm}
              onChange={(e) =>
                handleChange("judgeAlgorithm", e.target.value as JudgeAlgorithm)
              }
              className="w-full rounded-2xl border border-white/50 bg-white/80 px-4 py-2.5 text-base text-slate-900 shadow-sm transition focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-900"
            >
              <option value="smartConsensus">Smart Consensus</option>
              <option value="conservativeMode">Conservative Mode</option>
              <option value="optimisticMode">Optimistic Mode</option>
              <option value="simpleAverage">Simple Average</option>
            </select>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              {localSettings.judgeAlgorithm === "smartConsensus" &&
                "Intelligently identifies consensus in voting patterns across different scenarios"}
              {localSettings.judgeAlgorithm === "conservativeMode" &&
                "Biases towards higher estimates to account for unforeseen complexity"}
              {localSettings.judgeAlgorithm === "optimisticMode" &&
                "Biases towards lower estimates assuming team efficiency"}
              {localSettings.judgeAlgorithm === "simpleAverage" &&
                "Simple mathematical average of all votes"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
