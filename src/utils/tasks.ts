import type { RoomData } from "../types";
import { getVoteKeyForUser } from "./room";

export function getUsersVoteTaskSize(
  roomData: RoomData,
  name: string,
): string | null {
  const usersVote =
    roomData.votes[getVoteKeyForUser(roomData, name)] ?? roomData.votes[name];
  const metadata = roomData.settings.voteOptionsMetadata?.find(
    (m) => m.value === usersVote,
  );
  const taskSize = metadata?.taskSize || null;

  switch (taskSize) {
    case "xs":
      return "Extra Small";
    case "sm":
      return "Small";
    case "md":
      return "Medium";
    case "lg":
      return "Large";
    case "xl":
      return "Extra Large";
    default:
      return null;
  }
}
