import { useEffect, useState } from "react";
import type { RetroSettings } from "@sprintjam/types";
import { normaliseRetroSettings } from "@sprintjam/utils";

import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { RetroTemplateSelect } from "./RetroTemplateSelect";

interface RetroSettingsFieldsProps {
  settings: RetroSettings;
  onSettingsChange: (settings: RetroSettings) => void;
  disabled?: boolean;
}

export function RetroSettingsFields({
  settings,
  onSettingsChange,
  disabled = false,
}: RetroSettingsFieldsProps) {
  const [draftSettings, setDraftSettings] = useState(settings);

  useEffect(() => {
    setDraftSettings(settings);
  }, [settings]);

  const updateSettings = (patch: Partial<RetroSettings>) => {
    const updated = normaliseRetroSettings(draftSettings, patch);
    setDraftSettings(updated);
    onSettingsChange(updated);
  };

  return (
    <div className="space-y-5">
      <RetroTemplateSelect
        value={draftSettings.templateId}
        onValueChange={(templateId) => updateSettings({ templateId })}
        disabled={disabled}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Votes each"
          type="number"
          min={1}
          max={10}
          value={draftSettings.votesPerParticipant}
          disabled={disabled}
          onChange={(event) =>
            updateSettings({
              votesPerParticipant: Number(event.target.value),
            })
          }
          fullWidth
        />
        <Input
          label="Timer"
          type="number"
          min={1}
          max={60}
          value={draftSettings.timerMinutes}
          disabled={disabled}
          onChange={(event) =>
            updateSettings({ timerMinutes: Number(event.target.value) })
          }
          fullWidth
        />
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-slate-900/50">
        <div className="flex items-center justify-between gap-4">
          <div>
            <label
              htmlFor="retro-anonymous-cards"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Anonymous cards
            </label>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Hide authors while cards are discussed.
            </p>
          </div>
          <Switch
            id="retro-anonymous-cards"
            checked={draftSettings.anonymousCards}
            onCheckedChange={(checked) =>
              updateSettings({ anonymousCards: checked })
            }
            disabled={disabled}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <label
              htmlFor="retro-hide-cards-during-input"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Hide cards during input
            </label>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Keep each response private until the team moves to review.
            </p>
          </div>
          <Switch
            id="retro-hide-cards-during-input"
            checked={draftSettings.hideCardsDuringInput}
            onCheckedChange={(checked) =>
              updateSettings({ hideCardsDuringInput: checked })
            }
            disabled={disabled}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <label
              htmlFor="retro-phase-control"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Team can move phases
            </label>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Allow participants to move between input, review, and focus.
            </p>
          </div>
          <Switch
            id="retro-phase-control"
            checked={draftSettings.allowParticipantPhaseControl}
            onCheckedChange={(checked) =>
              updateSettings({ allowParticipantPhaseControl: checked })
            }
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
