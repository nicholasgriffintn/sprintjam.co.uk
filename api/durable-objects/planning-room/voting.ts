import type { StructuredVote } from "../../types";
import {
  isStructuredVote,
  createStructuredVote,
  isStructuredVoteComplete,
} from "../../utils/structured-voting";
import { determineRoomPhase } from "../../utils/room-phase";
import { getAnonymousUserId } from "../../utils/room-data";
import { ensureTimerState } from "../../utils/timer-state";
import { calculateTimerSeconds } from "../../utils/timer";
import type { PlanningRoom } from ".";
import { resetVotingState } from "./room-helpers";

export async function handleVote(
  room: PlanningRoom,
  userName: string,
  vote: string | number | StructuredVote,
) {
  const roomData = await room.getRoomData();
  if (!roomData) {
    return;
  }

  if (roomData.showVotes && !roomData.settings.allowVotingAfterReveal) {
    console.warn(
      `Vote from ${userName} rejected: voting not allowed after reveal`,
    );
    return;
  }

  const previousPhase = determineRoomPhase(roomData);

  let finalVote: string | number;
  let structuredVotePayload: StructuredVote | null = null;
  if (isStructuredVote(vote)) {
    const structuredVote = createStructuredVote(vote.criteriaScores);
    const calculatedPoints = structuredVote.calculatedStoryPoints || "?";
    finalVote = calculatedPoints;
    if (!roomData.structuredVotes) {
      roomData.structuredVotes = {};
    }
    roomData.structuredVotes[userName] = structuredVote;
    structuredVotePayload = structuredVote;
  } else {
    finalVote = vote;
  }

  const validOptions = roomData.settings.estimateOptions.map(String);
  if (!validOptions.includes(String(finalVote))) {
    console.warn(
      `Invalid vote ${finalVote} from ${userName}. Valid options: ${validOptions.join(
        ", ",
      )}`,
    );
    return;
  }

  roomData.votes[userName] = finalVote;
  const newPhase = determineRoomPhase(roomData);

  room.repository.setVote(userName, finalVote);

  if (structuredVotePayload) {
    room.repository.setStructuredVote(userName, structuredVotePayload);
  }

  const broadcastUser =
    roomData.settings.anonymousVotes || roomData.settings.hideParticipantNames
      ? getAnonymousUserId(roomData, userName)
      : userName;

  room.broadcast({
    type: "vote",
    user: broadcastUser,
    vote: finalVote,
    structuredVote: structuredVotePayload,
  });

  const shouldAutoReveal = (() => {
    if (roomData.showVotes || !roomData.settings.enableAutoReveal) {
      return false;
    }

    const voteCount = Object.keys(roomData.votes).length;
    const userCount = roomData.users.length;

    if (voteCount < userCount || userCount === 0) {
      return false;
    }

    if (roomData.settings.enableStructuredVoting && roomData.structuredVotes) {
      const allVotesComplete = roomData.users.every((userName) => {
        const structuredVote = roomData.structuredVotes?.[userName];
        if (!structuredVote) {
          return false;
        }
        return isStructuredVoteComplete(
          structuredVote.criteriaScores,
          roomData.settings.votingCriteria,
        );
      });
      return allVotesComplete;
    }

    return true;
  })();

  if (shouldAutoReveal) {
    roomData.showVotes = true;
    room.repository.setShowVotes(true);
    room.broadcast({
      type: "showVotes",
      showVotes: true,
    });

    if (roomData.settings.enableJudge) {
      await room.calculateAndUpdateJudgeScore();
    }
  } else if (roomData.showVotes && roomData.settings.enableJudge) {
    await room.calculateAndUpdateJudgeScore();
  }

  const shouldGenerateMusic =
    previousPhase !== newPhase &&
    !!roomData.settings.enableStrudelPlayer &&
    !!roomData.settings.strudelAutoGenerate;

  if (shouldGenerateMusic) {
    room
      .autoGenerateStrudel()
      .catch((err) =>
        console.error("Background Strudel generation failed:", err),
      );
  }
}

export async function handleShowVotes(room: PlanningRoom, userName: string) {
  const roomData = await room.getRoomData();
  if (!roomData) {
    return;
  }

  if (
    roomData.moderator !== userName &&
    !roomData.settings.allowOthersToShowEstimates
  ) {
    return;
  }

  if (roomData.settings.alwaysRevealVotes && roomData.showVotes) {
    console.warn(
      `Cannot hide votes in always-reveal mode (requested by ${userName})`,
    );
    return;
  }

  const previousPhase = determineRoomPhase(roomData);
  roomData.showVotes = !roomData.showVotes;
  const newPhase = determineRoomPhase(roomData);

  room.repository.setShowVotes(roomData.showVotes);

  room.broadcast({
    type: "showVotes",
    showVotes: roomData.showVotes,
  });

  if (roomData.showVotes && roomData.settings.enableJudge) {
    await room.calculateAndUpdateJudgeScore();
  }

  const shouldGenerateMusic =
    previousPhase !== newPhase &&
    !!roomData.settings.enableStrudelPlayer &&
    !!roomData.settings.strudelAutoGenerate;

  if (shouldGenerateMusic) {
    room
      .autoGenerateStrudel()
      .catch((err) =>
        console.error("Background Strudel generation failed:", err),
      );
  }
}

export async function handleResetVotes(room: PlanningRoom, userName: string) {
  const roomData = await room.getRoomData();
  if (!roomData) {
    return;
  }

  if (
    roomData.moderator !== userName &&
    !roomData.settings.allowOthersToDeleteEstimates
  ) {
    return;
  }

  const previousPhase = determineRoomPhase(roomData);
  resetVotingState(room, roomData);
  const newPhase = determineRoomPhase(roomData);

  room.broadcast({
    type: "resetVotes",
  });

  const timerState = ensureTimerState(roomData);
  if (timerState.autoResetOnVotesReset) {
    const now = Date.now();
    const currentSeconds = calculateTimerSeconds(timerState, now);
    timerState.roundAnchorSeconds = currentSeconds;
    room.repository.updateTimerConfig({
      roundAnchorSeconds: currentSeconds,
    });
    room.broadcast({
      type: "timerUpdated",
      timerState,
    });
  }

  const shouldGenerateMusic =
    previousPhase !== newPhase &&
    !!roomData.settings.enableStrudelPlayer &&
    !!roomData.settings.strudelAutoGenerate;

  if (shouldGenerateMusic) {
    room
      .autoGenerateStrudel()
      .catch((err) =>
        console.error("Background Strudel generation failed:", err),
      );
  }
}

export async function calculateAndUpdateJudgeScore(room: PlanningRoom) {
  const roomData = await room.getRoomData();

  if (!roomData || !roomData.settings.enableJudge || !roomData.showVotes) {
    return;
  }

  const allVotes = Object.values(roomData.votes).filter((v) => v !== null);
  const nonScoringVotes = new Set(["?", "❓", "coffee", "☕", "♾️"]);
  const totalVoteCount = allVotes.length;
  const questionMarkCount = allVotes.filter(
    (v) => v === "?" || v === "❓",
  ).length;

  const votes = allVotes.filter((v) => !nonScoringVotes.has(String(v)));
  const numericVotes = votes
    .filter((v) => !Number.isNaN(Number(v)))
    .map(Number);

  const validOptions = roomData.settings.estimateOptions
    .filter((opt) => !Number.isNaN(Number(opt)))
    .map(Number)
    .sort((a, b) => a - b);

  if (validOptions.length === 0 || numericVotes.length === 0) {
    roomData.judgeScore = null;
    roomData.judgeMetadata = undefined;
    room.repository.setJudgeState(null);
    return;
  }

  const result = room.judge.calculateJudgeScore(
    numericVotes,
    roomData.settings.judgeAlgorithm,
    validOptions,
    totalVoteCount,
    questionMarkCount,
  );

  roomData.judgeScore = result.score;
  roomData.judgeMetadata = {
    confidence: result.confidence,
    needsDiscussion: result.needsDiscussion,
    reasoning: result.reasoning,
    algorithm: roomData.settings.judgeAlgorithm,
    questionMarkCount,
    numericVoteCount: numericVotes.length,
    totalVoteCount,
  };

  room.repository.setJudgeState(result.score, roomData.judgeMetadata);

  room.broadcast({
    type: "judgeScoreUpdated",
    judgeScore: result.score,
    judgeMetadata: roomData.judgeMetadata,
  });
}
