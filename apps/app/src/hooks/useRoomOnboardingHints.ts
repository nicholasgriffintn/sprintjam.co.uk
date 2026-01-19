import { useEffect, useState } from "react";

import type { RoomData, RoomSettings } from "@/types";
import {
  ROOM_FACILITATION_PROMPT_SEEN_STORAGE_KEY,
  ROOM_HINTS_DISMISSED_STORAGE_KEY,
  ROOM_JOINED_STORAGE_KEY,
  ROOM_SPREAD_HINT_STORAGE_KEY,
} from '@/constants';
import { safeLocalStorage } from "@/utils/storage";
import type { VoteSpreadSummary } from "@/utils/room-guidance";

interface UseRoomOnboardingHintsParams {
  roomData: RoomData;
  isModeratorView: boolean;
  spreadSummary: VoteSpreadSummary;
  onUpdateSettings: (settings: RoomSettings) => void;
}

export const useRoomOnboardingHints = ({
  roomData,
  isModeratorView,
  spreadSummary,
  onUpdateSettings,
}: UseRoomOnboardingHintsParams) => {
  const [hintsDismissed, setHintsDismissed] = useState(false);
  const [isFirstRoomJoin, setIsFirstRoomJoin] = useState(false);
  const [showSpreadHint, setShowSpreadHint] = useState(false);
  const [showFacilitationOptIn, setShowFacilitationOptIn] = useState(false);

  useEffect(() => {
    const storedDismissed =
      safeLocalStorage.get(ROOM_HINTS_DISMISSED_STORAGE_KEY) === "true";
    setHintsDismissed(storedDismissed);
    const hasJoined = safeLocalStorage.get(ROOM_JOINED_STORAGE_KEY) === "true";
    setIsFirstRoomJoin(!hasJoined);
  }, []);

  useEffect(() => {
    if (hintsDismissed || !roomData.showVotes || !spreadSummary.isWideSpread) {
      setShowSpreadHint(false);
      return;
    }
    const spreadSeen =
      safeLocalStorage.get(ROOM_SPREAD_HINT_STORAGE_KEY) === "true";
    if (spreadSeen) {
      return;
    }
    setShowSpreadHint(true);
  }, [hintsDismissed, roomData.showVotes, spreadSummary.isWideSpread]);

  useEffect(() => {
    if (!isModeratorView || !isFirstRoomJoin) {
      setShowFacilitationOptIn(false);
      return;
    }
    if (roomData.settings.enableFacilitationGuidance) {
      setShowFacilitationOptIn(false);
      return;
    }
    const promptSeen =
      safeLocalStorage.get(ROOM_FACILITATION_PROMPT_SEEN_STORAGE_KEY) === "true";
    setShowFacilitationOptIn(!promptSeen);
  }, [isModeratorView, isFirstRoomJoin, roomData.settings.enableFacilitationGuidance]);

  const dismissHints = () => {
    setHintsDismissed(true);
    setIsFirstRoomJoin(false);
    setShowSpreadHint(false);
    safeLocalStorage.set(ROOM_HINTS_DISMISSED_STORAGE_KEY, "true");
    safeLocalStorage.set(ROOM_JOINED_STORAGE_KEY, 'true');
    if (showSpreadHint) {
      safeLocalStorage.set(ROOM_SPREAD_HINT_STORAGE_KEY, "true");
    }
  };

  const enableFacilitationGuidance = () => {
    onUpdateSettings({
      ...roomData.settings,
      enableFacilitationGuidance: true,
    });
    safeLocalStorage.set(ROOM_FACILITATION_PROMPT_SEEN_STORAGE_KEY, "true");
    setShowFacilitationOptIn(false);
  };

  const dismissFacilitationOptIn = () => {
    safeLocalStorage.set(ROOM_FACILITATION_PROMPT_SEEN_STORAGE_KEY, "true");
    setShowFacilitationOptIn(false);
  };

  const showOnboardingHints =
    !hintsDismissed &&
    (showFacilitationOptIn || (!isModeratorView && isFirstRoomJoin));

  return {
    showOnboardingHints,
    showSpreadHint,
    showFacilitationOptIn,
    isFirstRoomJoin,
    dismissHints,
    enableFacilitationGuidance,
    dismissFacilitationOptIn,
  };
};
