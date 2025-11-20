import type { RoomData } from "../types";

export type RoomPhase = "lobby" | "voting" | "discussion";

export function determineRoomPhase(roomData: RoomData): RoomPhase {
  const voteCount = Object.keys(roomData.votes).length;

  if (voteCount === 0 && !roomData.showVotes) {
    return "lobby";
  }

  if (voteCount > 0 && !roomData.showVotes) {
    return "voting";
  }

  if (roomData.showVotes) {
    return "discussion";
  }

  return "lobby";
}
