import type { PlanningRoom } from ".";
import {
  anonymizeRoomData,
  calculateVotingCompletion,
} from "../../lib/room-data";

export async function handleToggleSpectator(
  room: PlanningRoom,
  userName: string,
  isSpectator: boolean,
) {
  room.repository.setUserSpectatorMode(userName, isSpectator);

  if (isSpectator) {
    room.repository.deleteUserVote(userName);
  }

  const roomData = await room.getRoomData();
  if (!roomData) {
    return;
  }

  const votingCompletion = calculateVotingCompletion(roomData);
  roomData.votingCompletion = votingCompletion;
  const { votes, structuredVotes } = anonymizeRoomData(roomData);

  room.broadcast({
    type: "spectatorStatusChanged",
    user: userName,
    isSpectator,
    users: roomData.users,
    spectators: roomData.spectators ?? [],
    votes,
    structuredVotes,
    votingCompletion,
  });

  if (isSpectator && roomData.showVotes && roomData.settings.enableJudge) {
    await room.calculateAndUpdateJudgeScore();
  }
}
