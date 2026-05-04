import type { RoomSettings, JudgeAlgorithm } from "@/types";
import { BetaBadge } from "@/components/BetaBadge";
import { Checkbox } from "@/components/ui/Checkbox";

export function BackgroundMusic({
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
    <div className="space-y-3 rounded-2xl">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          Background Music <BetaBadge />
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center">
          <Checkbox
            id="enableStrudelPlayer"
            checked={localSettings.enableStrudelPlayer || false}
            onCheckedChange={(checked) =>
              handleChange("enableStrudelPlayer", checked)
            }
          />
          <label
            htmlFor="enableStrudelPlayer"
            className="ml-2 text-sm text-slate-700 dark:text-slate-300"
          >
            Enable background music player
          </label>
        </div>
        <p className="ml-6 text-xs text-slate-500 dark:text-slate-400">
          Generates ambient music based on room phase using AI. Users can
          control playback individually.
        </p>
      </div>
      {localSettings.enableStrudelPlayer && (
        <div className="ml-6 space-y-2">
          <div className="flex items-center">
            <Checkbox
              id="strudelAutoGenerate"
              checked={localSettings.strudelAutoGenerate || false}
              onCheckedChange={(checked) =>
                handleChange("strudelAutoGenerate", checked)
              }
            />
            <label
              htmlFor="strudelAutoGenerate"
              className="ml-2 text-sm text-slate-700 dark:text-slate-300"
            >
              Auto-generate on phase changes
            </label>
          </div>
          <p className="ml-6 text-xs text-slate-500 dark:text-slate-400">
            Automatically generates new music when room transitions between
            phases (lobby, voting, discussion).
          </p>
        </div>
      )}
    </div>
  );
}
