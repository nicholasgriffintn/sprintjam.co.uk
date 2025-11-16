import { useEffect, useRef, useState } from 'react';

import type { RoomData, VoteValue } from '../../../types';

const ANIMATION_DURATION_MS = 2000;

export function useJudgeAnimation(roomData: RoomData) {
  const [showJudgeAnimation, setShowJudgeAnimation] = useState(false);
  const previousJudgeScoreRef = useRef<VoteValue | null>(null);

  useEffect(() => {
    if (
      roomData.settings.enableJudge &&
      roomData.judgeScore !== null &&
      roomData.judgeScore !== previousJudgeScoreRef.current &&
      roomData.showVotes
    ) {
      setShowJudgeAnimation(true);

      const timer = setTimeout(() => {
        setShowJudgeAnimation(false);
      }, ANIMATION_DURATION_MS);

      previousJudgeScoreRef.current = roomData.judgeScore;

      return () => clearTimeout(timer);
    }
  }, [
    roomData.judgeScore,
    roomData.showVotes,
    roomData.settings.enableJudge,
  ]);

  return showJudgeAnimation;
}
