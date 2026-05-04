import type { RoomGameType } from "@sprintjam/types";

export const formatRoomGameTitle = (gameType: RoomGameType): string =>
  gameType
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const formatRoomGameAnnouncementTitle = (
  gameType: RoomGameType,
): string => gameType.replace(/-/g, " ");
