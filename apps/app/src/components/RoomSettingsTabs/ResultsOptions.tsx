import { Minus, Plus } from "lucide-react";

import type { RoomSettings, JudgeAlgorithm } from "@/types";
import { Checkbox } from "@/components/ui/Checkbox";
import * as NumberField from "@/components/ui/NumberField";

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
          <Checkbox
            id="allowVotingAfterReveal"
            checked={localSettings.allowVotingAfterReveal || false}
            onCheckedChange={(checked) =>
              handleChange("allowVotingAfterReveal", checked)
            }
            data-testid="settings-toggle-allow-voting-after-reveal"
          />
          <label
            htmlFor="allowVotingAfterReveal"
            className="ml-2 text-sm text-slate-700 dark:text-slate-300"
          >
            Allow voting after reveal
          </label>
        </div>
        <div className="flex items-center">
          <Checkbox
            id="enableAutoReveal"
            checked={localSettings.enableAutoReveal || false}
            onCheckedChange={(checked) =>
              handleChange("enableAutoReveal", checked)
            }
            data-testid="settings-toggle-auto-reveal"
          />
          <label
            htmlFor="enableAutoReveal"
            className="ml-2 text-sm text-slate-700 dark:text-slate-300"
          >
            Auto-reveal when everyone has voted
          </label>
        </div>
        <div className="flex items-center">
          <Checkbox
            id="alwaysRevealVotes"
            checked={localSettings.alwaysRevealVotes || false}
            onCheckedChange={(checked) =>
              handleChange("alwaysRevealVotes", checked)
            }
            data-testid="settings-toggle-always-reveal"
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
      <div className="space-y-2">
        <div className="flex items-center">
          <Checkbox
            id="showTimer"
            checked={localSettings.showTimer}
            onCheckedChange={(checked) => handleChange("showTimer", checked)}
            data-testid="settings-toggle-show-timer"
          />
          <label
            htmlFor="showTimer"
            className="ml-2 text-sm text-slate-700 dark:text-slate-300"
          >
            Show timer
          </label>
        </div>
        <div className="flex items-center">
          <Checkbox
            id="showAverage"
            checked={localSettings.showAverage}
            onCheckedChange={(checked) => handleChange("showAverage", checked)}
          />
          <label
            htmlFor="showAverage"
            className="ml-2 text-sm text-slate-700 dark:text-slate-300"
          >
            Show average
          </label>
        </div>
        <div className="flex items-center">
          <Checkbox
            id="showMedian"
            checked={localSettings.showMedian}
            onCheckedChange={(checked) => handleChange("showMedian", checked)}
          />
          <label
            htmlFor="showMedian"
            className="ml-2 text-sm text-slate-700 dark:text-slate-300"
          >
            Show median
          </label>
        </div>
        <div className="flex items-center">
          <Checkbox
            id="showTopVotes"
            checked={localSettings.showTopVotes}
            onCheckedChange={(checked) => handleChange("showTopVotes", checked)}
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
            <NumberField.Root
              value={localSettings.topVotesCount}
              onValueChange={(value) =>
                handleChange("topVotesCount", value ?? 1)
              }
              min={1}
              max={10}
            >
              <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">
                Number of top votes to show
              </label>
              <NumberField.Group>
                <NumberField.Decrement>
                  <Minus className="h-4 w-4" />
                </NumberField.Decrement>
                <NumberField.Input />
                <NumberField.Increment>
                  <Plus className="h-4 w-4" />
                </NumberField.Increment>
              </NumberField.Group>
            </NumberField.Root>
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
          <Checkbox
            id="enableFacilitationGuidance"
            checked={localSettings.enableFacilitationGuidance || false}
            onCheckedChange={(checked) =>
              handleChange("enableFacilitationGuidance", checked)
            }
            data-testid="settings-toggle-facilitation-guidance"
            className="mt-1"
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
