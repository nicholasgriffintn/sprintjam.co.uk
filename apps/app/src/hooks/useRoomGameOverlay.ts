import { useEffect, useState } from "react";

import type { RoomData } from "@/types";
import {
  formatRoomGameAnnouncementTitle,
  formatRoomGameTitle,
} from "@/utils/room-game";

export const useRoomGameOverlay = (roomData: RoomData) => {
  const [gameAnnouncement, setGameAnnouncement] = useState<string | null>(null);
  const [isGamePanelMinimised, setIsGamePanelMinimised] = useState(false);

  useEffect(() => {
    if (!roomData.gameSession || roomData.gameSession.status !== "active") {
      return;
    }

    setGameAnnouncement(
      `${roomData.gameSession.startedBy} started ${formatRoomGameAnnouncementTitle(
        roomData.gameSession.type,
      )}. Jump in from the game panel!`,
    );
    setIsGamePanelMinimised(false);
    const timeout = setTimeout(() => setGameAnnouncement(null), 6000);

    return () => clearTimeout(timeout);
  }, [roomData.gameSession?.startedAt]);

  useEffect(() => {
    if (!roomData.gameSession) {
      setIsGamePanelMinimised(false);
    }
  }, [roomData.gameSession]);

  const gameTitle = roomData.gameSession
    ? formatRoomGameTitle(roomData.gameSession.type)
    : "";

  return {
    gameAnnouncement,
    setGameAnnouncement,
    isGamePanelMinimised,
    setIsGamePanelMinimised,
    gameTitle,
  };
};
