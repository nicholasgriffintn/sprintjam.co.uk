import type { RoomSettings, JudgeAlgorithm } from "@/types";

type HandleChange = (
  key: keyof RoomSettings,
  value: boolean | (string | number)[] | JudgeAlgorithm | number | string,
) => void;

function RevealOptionsSection({
  localSettings,
  handleChange,
}: {
  localSettings: RoomSettings;
  handleChange: HandleChange;
}) {
  return (
    <div className="pt-2">
      <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        Reveal Options
      </h3>
      <div className="space-y-2">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="allowVotingAfterReveal"
            checked={localSettings.allowVotingAfterReveal || false}
            onChange={(e) =>
              handleChange("allowVotingAfterReveal", e.target.checked)
            }
            data-testid="settings-toggle-allow-voting-after-reveal"
            className="h-4 w-4 rounded border-white/50 text-brand-600 focus:ring-brand-500 dark:border-white/10"
          />
          <label
            htmlFor="allowVotingAfterReveal"
            className="ml-2 text-sm text-slate-700 dark:text-slate-300"
          >
            Allow voting after reveal
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="enableAutoReveal"
            checked={localSettings.enableAutoReveal || false}
            onChange={(e) => handleChange("enableAutoReveal", e.target.checked)}
            data-testid="settings-toggle-auto-reveal"
            className="h-4 w-4 rounded border-white/50 text-brand-600 focus:ring-brand-500 dark:border-white/10"
          />
          <label
            htmlFor="enableAutoReveal"
            className="ml-2 text-sm text-slate-700 dark:text-slate-300"
          >
            Auto-reveal when everyone has voted
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="alwaysRevealVotes"
            checked={localSettings.alwaysRevealVotes || false}
            onChange={(e) =>
              handleChange("alwaysRevealVotes", e.target.checked)
            }
            data-testid="settings-toggle-always-reveal"
            className="h-4 w-4 rounded border-white/50 text-brand-600 focus:ring-brand-500 dark:border-white/10"
          />
          <label
            htmlFor="alwaysRevealVotes"
            className="ml-2 text-sm text-slate-700 dark:text-slate-300"
          >
            Always reveal votes (no hide option)
          </label>
        </div>
      </div>
    </div>
  );
}

function DisplayOptionsSection({
  localSettings,
  handleChange,
}: {
  localSettings: RoomSettings;
  handleChange: HandleChange;
}) {
  return (
    <div className="pt-2">
      <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        Display Options
      </h3>
      <div className="flex items-center">
        <input
          type="checkbox"
          id="showTimer"
          checked={localSettings.showTimer}
          onChange={(e) => handleChange("showTimer", e.target.checked)}
          data-testid="settings-toggle-show-timer"
          className="h-4 w-4 rounded border-white/50 text-brand-600 focus:ring-brand-500 dark:border-white/10"
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
          id="showAverage"
          checked={localSettings.showAverage}
          onChange={(e) => handleChange("showAverage", e.target.checked)}
          className="h-4 w-4 rounded border-white/50 text-brand-600 focus:ring-brand-500 dark:border-white/10"
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
          onChange={(e) => handleChange("showMedian", e.target.checked)}
          className="h-4 w-4 rounded border-white/50 text-brand-600 focus:ring-brand-500 dark:border-white/10"
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
            onChange={(e) => handleChange("showTopVotes", e.target.checked)}
            className="h-4 w-4 rounded border-white/50 text-brand-600 focus:ring-brand-500 dark:border-white/10"
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
              className="mb-1 block text-sm text-slate-700 dark:text-slate-300"
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
                handleChange("topVotesCount", parseInt(e.target.value) || 1)
              }
              className="w-20 rounded-2xl border border-white/50 bg-white/80 px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-900"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function FacilitationOptionsSection({
  localSettings,
  handleChange,
}: {
  localSettings: RoomSettings;
  handleChange: HandleChange;
}) {
  return (
    <div className="pt-2">
      <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        Facilitation Guidance
      </h3>
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="enableFacilitationGuidance"
            checked={localSettings.enableFacilitationGuidance || false}
            onChange={(e) =>
              handleChange("enableFacilitationGuidance", e.target.checked)
            }
            data-testid="settings-toggle-facilitation-guidance"
            className="mt-1 h-4 w-4 rounded border-white/50 text-brand-600 focus:ring-brand-500 dark:border-white/10"
          />
          <label
            htmlFor="enableFacilitationGuidance"
            className="text-sm text-slate-700 dark:text-slate-300"
          >
            Show contextual facilitation prompts in the room
          </label>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Visible only to moderators and never interrupts the session.
        </p>
      </div>
    </div>
  );
}

export function ResultsOptions({
  localSettings,
  handleChange,
}: {
  localSettings: RoomSettings;
  handleChange: HandleChange;
}) {
  return (
    <div className="space-y-3">
      <RevealOptionsSection
        localSettings={localSettings}
        handleChange={handleChange}
      />
      <DisplayOptionsSection
        localSettings={localSettings}
        handleChange={handleChange}
      />
      <FacilitationOptionsSection
        localSettings={localSettings}
        handleChange={handleChange}
      />
    </div>
  );
}
