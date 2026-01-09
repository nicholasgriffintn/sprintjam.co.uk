import { useEffect, useRef, useState } from "react";

interface UseDisplayQueueSetupOptions {
  isQueueEnabled: boolean;
  queueProvider: string;
  roomData: any;
  name: string;
}

export const useDisplayQueueSetup = ({
  isQueueEnabled,
  queueProvider,
  roomData,
  name,
}: UseDisplayQueueSetupOptions) => {
  const [isQueueSetupModalOpen, setIsQueueSetupModalOpen] = useState(false);
  const didPreviouslyDisplay = useRef(false);

  useEffect(() => {
    try {
      if (!isQueueEnabled) {
        return;
      }
      if (queueProvider === "none") {
        return;
      }
      if (didPreviouslyDisplay.current) {
        return;
      }

      const queueEmpty =
        !roomData.ticketQueue || roomData.ticketQueue.length === 0;
      const isModerator = roomData.moderator === name;

      if (queueEmpty && isModerator) {
        didPreviouslyDisplay.current = true;
        setIsQueueSetupModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to display queue setup modal", err);
    }
  }, [isQueueEnabled, queueProvider, roomData, name]);

  return { isQueueSetupModalOpen, setIsQueueSetupModalOpen };
};
