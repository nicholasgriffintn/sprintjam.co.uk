import type { FC } from "react";

import { ShareSessionModal } from "@/components/share/ShareSessionModal";

interface ShareRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomKey: string;
}

const ShareRoomModal: FC<ShareRoomModalProps> = ({
  isOpen,
  onClose,
  roomKey,
}) => {
  return (
    <ShareSessionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Room"
      sessionType="room"
      sessionKey={roomKey}
      inputId="share-room-url"
      inputAriaLabel="Shareable room URL"
      copySuccessMessage="Room link copied"
      copyErrorMessage="Couldn't copy room link"
      qrCodeTitle="QR code for room invite link"
      footer="Anyone with this link can join this planning room."
    />
  );
};

export default ShareRoomModal;
