import type { RoomData, VotingCriterion } from "@sprintjam/types";

import type { PlanningRoom } from ".";
import { resetVotingState } from "./room-helpers";
import { applySettingsUpdate } from "../../lib/room-settings";

function getVotingCriteriaSignature(criteria?: VotingCriterion[]) {
  return JSON.stringify(
    (criteria ?? []).map((criterion) => ({
      id: criterion.id,
      name: criterion.name,
      description: criterion.description,
      minScore: criterion.minScore,
      maxScore: criterion.maxScore,
      weight: criterion.weight ?? null,
      scoringDirection: criterion.scoringDirection ?? null,
      conversionRules:
        criterion.conversionRules?.map((rule) => ({
          score: rule.score,
          minimumPercentageScore: rule.minimumPercentageScore,
          label: rule.label,
        })) ?? [],
    })),
  );
}

export async function handleUpdateSettings(
  room: PlanningRoom,
  userName: string,
  settings: Partial<RoomData["settings"]>,
) {
  const roomData = await room.getRoomData();
  if (!roomData) {
    return;
  }

  if (roomData.moderator !== userName) {
    return;
  }
  const judgeSettingsChanged =
    (settings.enableJudge !== undefined &&
      settings.enableJudge !== roomData.settings.enableJudge) ||
    (settings.judgeAlgorithm !== undefined &&
      settings.judgeAlgorithm !== roomData.settings.judgeAlgorithm);

  const oldEstimateOptions = roomData.settings.estimateOptions.map(String);
  const oldStructuredVoting = roomData.settings.enableStructuredVoting;
  const oldVotingCriteria = roomData.settings.votingCriteria;
  const newSettings = applySettingsUpdate({
    currentSettings: roomData.settings,
    settingsUpdate: settings,
  });
  const newEstimateOptions = newSettings.estimateOptions.map(String);
  const newStructuredVoting = newSettings.enableStructuredVoting;
  const newVotingCriteria = newSettings.votingCriteria;

  const estimateOptionsChanged =
    oldEstimateOptions.length !== newEstimateOptions.length ||
    !oldEstimateOptions.every((opt, idx) => opt === newEstimateOptions[idx]);

  const structuredVotingModeChanged =
    oldStructuredVoting !== newStructuredVoting;
  const structuredVotingCriteriaChanged =
    newStructuredVoting === true &&
    settings.votingCriteria !== undefined &&
    getVotingCriteriaSignature(oldVotingCriteria) !==
      getVotingCriteriaSignature(newVotingCriteria);
  const hasCurrentRoundVotingState =
    Object.keys(roomData.votes).length > 0 ||
    Object.keys(roomData.structuredVotes ?? {}).length > 0 ||
    roomData.judgeScore !== null ||
    roomData.judgeMetadata !== undefined;

  const wasAlwaysReveal = roomData.settings.alwaysRevealVotes || false;

  roomData.settings = newSettings;
  room.repository.setSettings(roomData.settings);

  let votingStateReset = false;

  if (
    newSettings.alwaysRevealVotes &&
    !wasAlwaysReveal &&
    !roomData.showVotes
  ) {
    roomData.showVotes = true;
    room.repository.setShowVotes(true);
  }

  if (estimateOptionsChanged) {
    const validOptions = newEstimateOptions;
    const invalidVotes = Object.entries(roomData.votes).filter(
      ([, vote]) => !validOptions.includes(String(vote)),
    );

    if (invalidVotes.length > 0) {
      resetVotingState(room, roomData);
      votingStateReset = true;
      room.broadcast({
        type: "resetVotes",
      });
    }
  }

  if (
    !votingStateReset &&
    structuredVotingCriteriaChanged &&
    hasCurrentRoundVotingState
  ) {
    resetVotingState(room, roomData);
    votingStateReset = true;
    room.broadcast({
      type: "resetVotes",
    });
  } else if (
    !votingStateReset &&
    structuredVotingModeChanged &&
    !newStructuredVoting
  ) {
    if (
      roomData.structuredVotes &&
      Object.keys(roomData.structuredVotes).length > 0
    ) {
      roomData.structuredVotes = {};
      room.repository.clearStructuredVotes();
    }
  }

  room.broadcast({
    type: "settingsUpdated",
    settings: roomData.settings,
  });

  if (newSettings.alwaysRevealVotes && !wasAlwaysReveal) {
    room.broadcast({
      type: "showVotes",
      showVotes: roomData.showVotes,
    });
  }

  if (
    judgeSettingsChanged &&
    roomData.showVotes &&
    roomData.settings.enableJudge
  ) {
    await room.calculateAndUpdateJudgeScore();
  } else if (judgeSettingsChanged && !roomData.settings.enableJudge) {
    roomData.judgeScore = null;
    roomData.judgeMetadata = undefined;
    room.repository.setJudgeState(null);

    room.broadcast({
      type: "judgeScoreUpdated",
      judgeScore: null,
    });
  }
}
