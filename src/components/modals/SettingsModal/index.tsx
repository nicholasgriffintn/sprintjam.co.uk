import { useEffect, useState, type FC } from "react";

import type {
  RoomSettings,
  VotingSequenceId,
  VotingSequenceTemplate,
  ExtraVoteOption,
} from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { RoomSettingsTabs } from "@/components/RoomSettingsTabs";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: RoomSettings;
  onSaveSettings: (settings: RoomSettings) => void;
  defaultSettings: RoomSettings;
  structuredVotingOptions: (string | number)[];
  votingPresets?: VotingSequenceTemplate[];
  extraVoteOptions?: ExtraVoteOption[];
  defaultSequenceId?: VotingSequenceId;
}

const SettingsModal: FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  defaultSettings,
  structuredVotingOptions,
  votingPresets,
  extraVoteOptions,
  defaultSequenceId,
}) => {
  const [draftSettings, setDraftSettings] = useState<RoomSettings>(settings);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setDraftSettings(settings);
  }, [isOpen, settings]);

  useEffect(() => {
    if (!isOpen) return;
    setResetKey((key) => key + 1);
  }, [isOpen]);

  const handleSave = () => {
    onSaveSettings(draftSettings);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Room Settings" size="md">
      <>
        <div className="max-h-[60vh] space-y-6 overflow-y-auto pr-1">
          <RoomSettingsTabs
            initialSettings={draftSettings}
            defaultSettings={defaultSettings}
            structuredVotingOptions={structuredVotingOptions}
            votingPresets={votingPresets}
            extraVoteOptions={extraVoteOptions}
            defaultSequenceId={defaultSequenceId}
            onSettingsChange={setDraftSettings}
            isActive={isOpen}
            resetKey={resetKey}
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
