import { useState, useEffect } from "react";
import type { WheelSettings } from "@sprintjam/types";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface WheelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: WheelSettings;
  onSave: (settings: Partial<WheelSettings>) => void;
  onReset: () => void;
  disabled?: boolean;
}

export function WheelSettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
  onReset,
  disabled,
}: WheelSettingsModalProps) {
  const [draftSettings, setDraftSettings] = useState<WheelSettings>(settings);

  useEffect(() => {
    if (isOpen) {
      setDraftSettings(settings);
    }
  }, [isOpen, settings]);

  const handleSave = () => {
    onSave(draftSettings);
    onClose();
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Wheel Settings" size="md">
      <div className="space-y-6">
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={draftSettings.removeWinnerAfterSpin}
              onChange={(e) =>
                setDraftSettings({
                  ...draftSettings,
                  removeWinnerAfterSpin: e.target.checked,
                })
              }
              disabled={disabled}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Remove winner after spin
            </span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={draftSettings.showConfetti}
              onChange={(e) =>
                setDraftSettings({
                  ...draftSettings,
                  showConfetti: e.target.checked,
                })
              }
              disabled={disabled}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Show confetti on winner
            </span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={draftSettings.playSounds}
              onChange={(e) =>
                setDraftSettings({
                  ...draftSettings,
                  playSounds: e.target.checked,
                })
              }
              disabled={disabled}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Play sounds
            </span>
          </label>

          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">
              Spin duration: {draftSettings.spinDurationMs / 1000}s
            </label>
            <input
              type="range"
              min={2000}
              max={10000}
              step={500}
              value={draftSettings.spinDurationMs}
              onChange={(e) =>
                setDraftSettings({
                  ...draftSettings,
                  spinDurationMs: parseInt(e.target.value, 10),
                })
              }
              disabled={disabled}
              className="w-full"
            />
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <Button
            variant="secondary"
            onClick={handleReset}
            disabled={disabled}
            className="w-full"
          >
            Reset wheel (clear results)
          </Button>
        </div>

        <div className="flex justify-end gap-3">
          <Button onClick={onClose} variant="secondary" size="md">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="primary"
            size="md"
            disabled={disabled}
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
