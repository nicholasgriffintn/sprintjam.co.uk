import { useState } from "react";

import { playFidgetSpinSound } from "@/lib/fidget-audio";

export function SpinnerToy({
  seed,
  isSoundEnabled,
}: {
  seed: number;
  isSoundEnabled: boolean;
}) {
  const [spin, setSpin] = useState(seed * 90);

  return (
    <button
      type="button"
      onClick={() => {
        if (isSoundEnabled) {
          playFidgetSpinSound();
        }
        setSpin((current) => current + 720);
      }}
      className="mx-auto grid h-36 w-36 place-items-center rounded-full border border-brand-100 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.95),rgba(238,246,255,0.72)_48%,rgba(47,109,255,0.12)_49%,rgba(47,109,255,0.06)_100%)] transition hover:scale-[1.02] dark:border-brand-300/20 dark:bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,0.95),rgba(23,45,112,0.5)_50%,rgba(83,152,255,0.12)_51%,rgba(83,152,255,0.04)_100%)]"
      aria-label="Spin fidget spinner"
    >
      <span
        className="relative block h-24 w-24 rounded-full transition-transform duration-1000 ease-out motion-reduce:duration-100"
        style={{ transform: `rotate(${spin}deg)` }}
      >
        <span className="absolute left-1/2 top-1/2 h-4 w-16 origin-left -translate-y-1/2 rounded-full bg-slate-900 shadow-sm dark:bg-slate-100" />
        <span className="absolute left-1/2 top-1/2 h-4 w-16 origin-left -translate-y-1/2 rotate-[120deg] rounded-full bg-slate-900 shadow-sm dark:bg-slate-100" />
        <span className="absolute left-1/2 top-1/2 h-4 w-16 origin-left -translate-y-1/2 rotate-[240deg] rounded-full bg-slate-900 shadow-sm dark:bg-slate-100" />
        <span className="absolute left-1/2 top-0 h-11 w-11 -translate-x-1/2 rounded-full bg-brand-500 shadow-md ring-4 ring-white dark:ring-slate-950" />
        <span className="absolute bottom-2 left-0 h-11 w-11 rounded-full bg-emerald-400 shadow-md ring-4 ring-white dark:ring-slate-950" />
        <span className="absolute bottom-2 right-0 h-11 w-11 rounded-full bg-amber-400 shadow-md ring-4 ring-white dark:ring-slate-950" />
        <span className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-[6px] border-white bg-slate-900 shadow-md dark:border-slate-950 dark:bg-white" />
        <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white dark:bg-slate-950" />
      </span>
    </button>
  );
}
