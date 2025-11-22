import { useState, useEffect, type FC } from "react";

import type { RoomSettings, JudgeAlgorithm } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { VotingMode } from "./VotingMode";
import { EstimateOptions } from "./EstimateOptions";
import { TheJudge } from "./TheJudge";
import { OtherOptions } from "./OtherOptions";
import { BackgroundMusic } from "./BackgroundMusic";
import { TicketQueueSettings } from "./TicketQueueSettings";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: RoomSettings;
  onSaveSettings: (settings: RoomSettings) => void;
  defaultSettings: RoomSettings;
  structuredVotingOptions: (string | number)[];
}

const SettingsModal: FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  defaultSettings,
  structuredVotingOptions,
}) => {
  const [localSettings, setLocalSettings] = useState<RoomSettings>(settings);
  const [estimateOptionsInput, setEstimateOptionsInput] = useState<string>(
    settings.estimateOptions.join(","),
  );

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      setEstimateOptionsInput(settings.estimateOptions.join(","));
    }
  }, [isOpen, settings]);

  const handleChange = (
    key: keyof RoomSettings,
    value:
      | boolean
      | (string | number)[]
      | JudgeAlgorithm
      | number
      | string
      | null
  ) => {
    const newSettings = { ...localSettings, [key]: value };

    if (key === 'enableStructuredVoting' && value === true) {
      const structuredOptions = Array.from(structuredVotingOptions);
      newSettings.estimateOptions = structuredOptions;
      if (!newSettings.votingCriteria && defaultSettings.votingCriteria) {
        newSettings.votingCriteria = defaultSettings.votingCriteria.map(
          (criterion) => ({ ...criterion })
        );
      }
      setEstimateOptionsInput(
        structuredOptions.map((option) => option.toString()).join(',')
      );
    } else if (
      key === 'enableStructuredVoting' &&
      value === false &&
      !newSettings.estimateOptions
    ) {
      const defaultOptions = Array.from(defaultSettings.estimateOptions);
      newSettings.estimateOptions = defaultOptions;
      if (!newSettings.votingCriteria && defaultSettings.votingCriteria) {
        newSettings.votingCriteria = defaultSettings.votingCriteria.map(
          (criterion) => ({ ...criterion })
        );
      }
      setEstimateOptionsInput(
        defaultOptions.map((option) => option.toString()).join(',')
      );
    }

    if (
      key === 'showAverage' ||
      key === 'showMedian' ||
      key === 'showTopVotes'
    ) {
      if (newSettings.resultsDisplay?.summaryCards) {
        newSettings.resultsDisplay = {
          ...newSettings.resultsDisplay,
          summaryCards: newSettings.resultsDisplay.summaryCards.map((card) => {
            if (key === 'showAverage' && card.id === 'average') {
              return { ...card, enabled: value as boolean };
            }
            if (key === 'showMedian' && card.id === 'mode') {
              return { ...card, enabled: value as boolean };
            }
            if (key === 'showTopVotes' && card.id === 'topVotes') {
              return { ...card, enabled: value as boolean };
            }
            return card;
          }),
        };
      }
    }

    setLocalSettings(newSettings);
  };

  const handleEstimateOptionsChange = (value: string) => {
    setEstimateOptionsInput(value);

    const options = value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item !== "")
      .map((item) => {
        const num = Number(item);
        return Number.isNaN(num) ? item : num;
      });

    setLocalSettings({
      ...localSettings,
      estimateOptions: options,
    });
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Room Settings" size="md">
      <>
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
          <VotingMode
            localSettings={localSettings}
            handleChange={handleChange}
          />

          <EstimateOptions
            localSettings={localSettings}
            defaultSettings={defaultSettings}
            structuredVotingOptions={structuredVotingOptions}
            estimateOptionsInput={estimateOptionsInput}
            handleEstimateOptionsChange={handleEstimateOptionsChange}
          />

          <TheJudge localSettings={localSettings} handleChange={handleChange} />

          <OtherOptions
            localSettings={localSettings}
            handleChange={handleChange}
          />

          <TicketQueueSettings
            localSettings={localSettings}
            handleChange={handleChange}
          />

          <BackgroundMusic
            localSettings={localSettings}
            handleChange={handleChange}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button onClick={onClose} variant="secondary" size="md">
            Cancel
          </Button>
          <Button onClick={handleSave} variant="primary" size="md">
            Save
          </Button>
        </div>
      </>
    </Modal>
  );
};

export default SettingsModal;
