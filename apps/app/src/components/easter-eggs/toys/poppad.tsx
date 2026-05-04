import { useState } from "react";

import {
  playFidgetPopSound,
} from "@/lib/fidget-audio";

export function PopPadToy() {
  const [popped, setPopped] = useState<Set<number>>(() => new Set());

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

  return (
    <div className="grid grid-cols-4 gap-2 rounded-2xl bg-slate-100 p-3 dark:bg-white/10">
      {Array.from({ length: 12 }).map((_, index) => {
        const isPopped = popped.has(index);
        return (
          <button
            key={index}
            type="button"
            onClick={() => {
              playFidgetPopSound(!isPopped);
              toggleBubble(index);
            }}
            className={`aspect-square rounded-full border transition ${isPopped
              ? "border-slate-300 bg-slate-300 shadow-inner dark:border-slate-500 dark:bg-slate-600"
              : "border-brand-200 bg-brand-100 shadow-[inset_0_-6px_10px_rgba(47,109,255,0.22)] hover:-translate-y-0.5 dark:border-brand-300/30 dark:bg-brand-400/20"
              }`}
            aria-label={isPopped ? "Unpop bubble" : "Pop bubble"}
          />
        );
      })}
    </div>
  );
}