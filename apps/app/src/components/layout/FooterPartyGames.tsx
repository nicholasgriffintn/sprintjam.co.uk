import { useState } from "react";
import { Gamepad2 } from "lucide-react";

import { RoomGamesModal } from "@/components/games/RoomGamesModal";
import { Button } from "@/components/ui/Button";
import { useRoomActions, useRoomState } from "@/context/RoomContext";

export const FooterPartyGames = () => {
  const [isGamesModalOpen, setIsGamesModalOpen] = useState(false);
  const { roomData } = useRoomState();
  const { handleStartGame } = useRoomActions();

  if (!roomData) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="unstyled"
        onClick={() => setIsGamesModalOpen(true)}
        className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm transition hover:-translate-y-0.5 dark:border-brand-300/30 dark:bg-brand-400/10 dark:text-brand-100"
      >
        <Gamepad2 className="h-3.5 w-3.5" />
        Party games
      </Button>

      <RoomGamesModal
        isOpen={isGamesModalOpen}
        roomData={roomData}
        onClose={() => setIsGamesModalOpen(false)}
        onStartGame={handleStartGame}
      />
    </>
  );
};
