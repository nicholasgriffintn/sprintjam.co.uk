import type {
  ExtraVoteOption,
  RoomSettings,
  VotingSequenceId,
  VotingSequenceTemplate,
} from "@/types";
import { ChevronDown } from "lucide-react";
import { Select } from "@/components/ui/Select";

export function EstimateOptions({
  localSettings,
  defaultSettings,
  structuredVotingOptions,
  estimateOptionsInput,
  handleEstimateOptionsChange,
  votingPresets,
  selectedSequenceId,
  onSelectSequence,
  extraVoteOptions,
  onToggleExtraVote,
  defaultSequenceId,
  hideSelection,
}: {
  localSettings: RoomSettings;
  defaultSettings: RoomSettings;
  structuredVotingOptions: (string | number)[];
  estimateOptionsInput: string;
  handleEstimateOptionsChange: (value: string) => void;
  votingPresets: VotingSequenceTemplate[];
  selectedSequenceId: VotingSequenceId;
  onSelectSequence: (id: VotingSequenceId) => void;
  extraVoteOptions: ExtraVoteOption[];
  onToggleExtraVote: (id: string, enabled: boolean) => void;
  defaultSequenceId: VotingSequenceId;
  hideSelection?: boolean;
}) {
  const getOptionLabel = (preset: VotingSequenceTemplate) => {
    if (preset.id === defaultSequenceId) {
      return `${preset.label} (default)`;
    }
    return preset.label;
  };
  const showExtraOptions = !localSettings.enableStructuredVoting;
  const sequenceOptions = [
    ...votingPresets.map((preset) => ({
      label: getOptionLabel(preset),
      value: preset.id,
    })),
    { label: "Custom", value: "custom" },
  ];

  return (
    <div className="space-y-3">
      {!hideSelection && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <label
                htmlFor="voting-sequence-select"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Estimate Options
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose a preset or craft your own sequence.
              </p>
            </div>
            <Select
              id="voting-sequence-select"
              value={selectedSequenceId}
              disabled={localSettings.enableStructuredVoting}
              onValueChange={(value) =>
                onSelectSequence(value as VotingSequenceId)
              }
              data-testid="settings-select-voting-sequence"
              className="rounded-xl border border-slate-200/60 bg-white/90 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-white/10 dark:bg-slate-900/70 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-800"
              options={sequenceOptions}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="estimateOptions" className="sr-only">
              Custom estimate options
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
              disabled={
                localSettings.enableStructuredVoting ||
                selectedSequenceId !== "custom"
              }
              className={`w-full rounded-2xl border border-white/50 bg-white/80 px-4 py-2.5 text-base text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-brand-400 dark:focus:ring-brand-900 ${
                localSettings.enableStructuredVoting ||
                selectedSequenceId !== "custom"
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  : ""
              }`}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {localSettings.enableStructuredVoting
                ? "Fixed options for structured voting"
                : selectedSequenceId === "custom"
                  ? "Separate values with commas"
                  : "Preset selected—switch to custom to edit"}
            </p>
          </div>
        </>
      )}

      {showExtraOptions ? (
        <details className="group rounded-2xl border border-slate-200/60 bg-white/70 p-3 shadow-sm dark:border-white/10 dark:bg-slate-900/50">
          <summary className="flex  list-none items-center justify-between text-xs font-semibold text-slate-700 transition hover:text-slate-900 dark:text-slate-200 dark:hover:text-white">
            <span>Extra voting options</span>
            <ChevronDown
              className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180 dark:text-slate-400"
              aria-hidden
            />
          </summary>
          <div className="mt-2 space-y-1">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Special actions that won't affect the score but can guide
              discussion.
            </p>
            <div className="space-y-2">
              {extraVoteOptions.map((option) => (
                <label
                  key={option.id}
                  className="flex items-start gap-2 rounded-xl bg-white/60 px-3 py-2 text-sm text-slate-800 shadow-sm ring-1 ring-white/60 transition hover:bg-white/80 dark:bg-slate-800/60 dark:text-slate-100 dark:ring-white/10"
                >
                  <input
                    type="checkbox"
                    checked={option.enabled !== false}
                    onChange={(e) =>
                      onToggleExtraVote(option.id, e.target.checked)
                    }
                    data-testid={`extra-option-${option.id}`}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <div className="leading-tight">
                    <span className="font-semibold">
                      {option.value} {option.label}
                    </span>
                    {option.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {option.description}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </details>
      ) : null}
    </div>
  );
}
