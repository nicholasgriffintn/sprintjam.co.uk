import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { CodenamesCardType, CodenamesState, CodenamesTeam } from '@/types';

interface CodenamesGameProps {
  state: CodenamesState;
  assignments: CodenamesCardType[] | null;
  isSpymaster: boolean;
  myTeam: CodenamesTeam | null;
  isMyTurn: boolean;
  canGuess: boolean;
  canGiveClue: boolean;
  onClose: () => void;
  onReveal: (index: number) => void;
  onEnd: () => void;
  onGiveClue: (word: string, count: number) => void;
  onPass: () => void;
}

const cardColors: Record<CodenamesCardType, string> = {
  red: 'bg-red-500 text-white',
  blue: 'bg-blue-500 text-white',
  neutral: 'bg-amber-200 text-amber-900',
  assassin: 'bg-slate-900 text-white',
};

export function CodenamesGame({
  state,
  assignments,
  isSpymaster,
  myTeam,
  isMyTurn,
  canGuess,
  canGiveClue,
  onClose,
  onReveal,
  onEnd,
  onGiveClue,
  onPass,
}: CodenamesGameProps) {
  const [stagedIndices, setStagedIndices] = useState<Set<number>>(new Set());
  const [clueWord, setClueWord] = useState('');
  const [clueCount, setClueCount] = useState<number>(0);

  useEffect(() => {
    setStagedIndices(new Set());
  }, [state.version]);

  const renderCard = (word: string, index: number) => {
    const isRevealed = state.revealed[index];
    const assignment = assignments?.[index];
    const baseColor =
      assignment && isSpymaster
        ? cardColors[assignment]
        : 'bg-slate-100 dark:bg-slate-800';
    const revealedColor =
      assignment && isRevealed ? cardColors[assignment] : baseColor;

    const isStaged = stagedIndices.has(index);
    const disabled =
      isRevealed ||
      !!state.winner ||
      !canGuess ||
      state.clueWord === null ||
      state.clueCount === null;

    return (
      <div className="relative">
        <button
          key={`${word}-${index}`}
          onClick={() => {
            if (disabled) return;
            setStagedIndices((prev) => {
              const next = new Set(prev);
              if (next.has(index)) {
                next.delete(index);
              } else {
                next.add(index);
              }
              return next;
            });
          }}
          disabled={disabled}
          className={`h-24 w-full rounded-lg p-3 text-center text-sm font-semibold transition ${revealedColor} ${
            disabled
              ? 'cursor-not-allowed opacity-80'
              : 'hover:scale-[1.01] hover:shadow-lg'
          } ${isStaged ? 'ring-2 ring-brand-500 ring-offset-2' : ''}`}
          aria-label={`Reveal ${word}`}
        >
          <span className="block truncate">{word}</span>
          {!isRevealed && assignment && isSpymaster && (
            <span className="mt-2 block text-xs opacity-80 capitalize">
              {assignment}
            </span>
          )}
          {!isRevealed && isStaged && canGuess && (
            <span className="mt-1 block text-[11px] text-slate-900 dark:text-white">
              Staged — press confirm
            </span>
          )}
        </button>
        {isStaged && !isRevealed && canGuess && (
          <button
            className="absolute right-2 top-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow"
            onClick={() => {
              onReveal(index);
              setStagedIndices((prev) => {
                const next = new Set(prev);
                next.delete(index);
                return next;
              });
            }}
          >
            Confirm
          </button>
        )}
      </div>
    );
  };

  return (
    <Modal isOpen onClose={onClose} title="Codenames" size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Badge variant="info">
              Turn:{' '}
              <span className="ml-2 font-semibold capitalize">
                {state.activeTeam}
              </span>
            </Badge>
            <Badge variant="default">
              Remaining — Red: {state.remaining.red} · Blue:{' '}
              {state.remaining.blue}
            </Badge>
            {state.clueWord && (
              <Badge variant="primary">
                Clue: {state.clueWord} ({state.clueCount ?? 0})
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={onEnd}>
              End game for everyone
            </Button>
          </div>
        </div>

        {state.winner && (
          <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-green-800 dark:border-green-900 dark:bg-green-950/50 dark:text-green-100">
            Winner:{' '}
            <span className="font-semibold capitalize">{state.winner}</span>
          </div>
        )}

        {canGiveClue && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/60">
            <div className="mb-2 font-semibold">Provide a clue</div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={clueWord}
                onChange={(e) => setClueWord(e.target.value)}
                placeholder="One-word clue"
                className="min-w-[160px] rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <input
                type="number"
                min={0}
                value={clueCount}
                onChange={(e) => setClueCount(Number(e.target.value))}
                className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (!clueWord.trim()) return;
                  onGiveClue(clueWord.trim(), Math.max(0, clueCount));
                  setClueWord('');
                  setClueCount(0);
                }}
              >
                Send clue
              </Button>
            </div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Counts are limited guesses per turn (count + 1).
            </div>
          </div>
        )}

        {canGuess && (
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <Badge variant="success">
              Guesses remaining: {state.guessesRemaining ?? 0}
            </Badge>
            <Button size="sm" variant="secondary" onClick={onPass}>
              Pass turn
            </Button>
          </div>
        )}

        <div className="grid grid-cols-5 gap-3">
          {state.board.map((word, idx) => renderCard(word, idx))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span>
              You are on:{' '}
              <span className="font-semibold capitalize">
                {myTeam ?? 'Unassigned'}
              </span>
            </span>
            {isSpymaster && <Badge variant="default">Spymaster view</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={onClose}>
              Hide game
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
