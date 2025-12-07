import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  addEventListener,
  removeEventListener,
  startCodenames,
  revealCodenames,
  endCodenames,
  sendCodenamesClue,
  passCodenames,
} from '@/lib/api-service';
import type {
  CodenamesCardType,
  CodenamesTeam,
  RoomData,
  WebSocketMessage,
} from '@/types';

export function useCodenamesGame(roomData: RoomData | null, userName: string) {
  const [spymasterAssignments, setSpymasterAssignments] = useState<
    CodenamesCardType[] | null
  >(null);

  const publicState = roomData?.codenamesState;

  const myTeam: CodenamesTeam | null = useMemo(() => {
    if (!publicState) return null;
    if (publicState.spymasters[userName]) {
      return publicState.spymasters[userName];
    }
    if (publicState.teams.red.includes(userName)) return 'red';
    if (publicState.teams.blue.includes(userName)) return 'blue';
    return null;
  }, [publicState, userName]);

  const isSpymaster = !!(publicState && publicState.spymasters[userName]);
  const isMyTurn = !!publicState && myTeam === publicState.activeTeam;
  const canGuess =
    !!publicState &&
    isMyTurn &&
    !isSpymaster &&
    !publicState.winner &&
    publicState.clueWord !== null &&
    publicState.clueCount !== null &&
    (publicState.guessesRemaining ?? 0) > 0;
  const canGiveClue =
    !!publicState &&
    isMyTurn &&
    isSpymaster &&
    !publicState.winner &&
    (!publicState.guessesTaken || publicState.guessesTaken === 0);

  useEffect(() => {
    if (!publicState) {
      setSpymasterAssignments(null);
    }
  }, [publicState?.version, publicState]);

  useEffect(() => {
    const handler = (message: WebSocketMessage) => {
      if (
        message.type === 'codenamesState' &&
        message.codenamesState?.assignments &&
        message.spymasterView
      ) {
        setSpymasterAssignments(message.codenamesState.assignments);
      }
    };

    addEventListener('codenamesState', handler);
    return () => {
      removeEventListener('codenamesState', handler);
    };
  }, []);

  const start = useCallback(() => {
    startCodenames();
  }, []);

  const reveal = useCallback((index: number) => {
    revealCodenames(index);
  }, []);

  const end = useCallback(() => {
    endCodenames();
  }, []);

  const giveClue = useCallback((word: string, count: number) => {
    sendCodenamesClue(word, count);
  }, []);

  const pass = useCallback(() => {
    passCodenames();
  }, []);

  return {
    state: publicState,
    assignments: spymasterAssignments,
    isSpymaster,
    myTeam,
    isMyTurn,
    canGuess,
    canGiveClue,
    start,
    reveal,
    end,
    giveClue,
    pass,
  };
}
