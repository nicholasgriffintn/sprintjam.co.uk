import { type KeyboardEvent, useMemo, useRef, useState } from "react";

import { playFidgetPopSound } from "@/lib/fidget-audio";

const BUBBLE_COUNT = 12;
const BUBBLE_COLUMNS = 4;

export function PopPadToy({ isSoundEnabled }: { isSoundEnabled: boolean }) {
  const [popped, setPopped] = useState<Set<number>>(() => new Set());
  const bubbleRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const bubbles = useMemo(
    () => Array.from({ length: BUBBLE_COUNT }, (_, index) => index),
    [],
  );

  const toggleBubble = (index: number) => {
    setPopped((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const focusBubble = (index: number) => {
    bubbleRefs.current[index]?.focus();
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const keyOffsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -BUBBLE_COLUMNS,
      ArrowDown: BUBBLE_COLUMNS,
    };
    const offset = keyOffsets[event.key];

    if (!offset) {
      return;
    }

    event.preventDefault();
    focusBubble((index + offset + BUBBLE_COUNT) % BUBBLE_COUNT);
  };

  return (
    <div className="grid grid-cols-4 gap-2 rounded-2xl bg-slate-100 p-3 dark:bg-white/10">
      {bubbles.map((index) => {
        const isPopped = popped.has(index);
        return (
          <button
            key={index}
            type="button"
            ref={(element) => {
              bubbleRefs.current[index] = element;
            }}
            onClick={() => {
              if (isSoundEnabled) {
                playFidgetPopSound(!isPopped);
              }
              toggleBubble(index);
            }}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`aspect-square rounded-full border transition motion-reduce:transition-none ${
              isPopped
                ? "border-slate-300 bg-slate-300 shadow-inner dark:border-slate-500 dark:bg-slate-600"
                : "border-brand-200 bg-brand-100 shadow-[inset_0_-6px_10px_rgba(47,109,255,0.22)] hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 dark:border-brand-300/30 dark:bg-brand-400/20"
            }`}
            aria-label={`Bubble ${index + 1}: ${isPopped ? "popped" : "unpopped"}`}
            aria-pressed={isPopped}
          />
        );
      })}
    </div>
  );
}
