import { useMemo, useState } from "react";

import { playFidgetSpinSound } from "@/lib/fidget-audio";
import { createSeededRandom } from "@/lib/seeded-random";

const SPINNER_PALETTES = [
  {
    shell:
      "border-brand-100 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.95),rgba(238,246,255,0.72)_48%,rgba(47,109,255,0.12)_49%,rgba(47,109,255,0.06)_100%)] dark:border-brand-300/20 dark:bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,0.95),rgba(23,45,112,0.5)_50%,rgba(83,152,255,0.12)_51%,rgba(83,152,255,0.04)_100%)]",
    body: "bg-slate-900 dark:bg-slate-100",
    pads: ["bg-brand-500", "bg-emerald-400", "bg-amber-400"],
  },
  {
    shell:
      "border-rose-100 bg-[radial-gradient(circle_at_50%_50%,rgba(255,247,247,0.96),rgba(255,228,230,0.72)_48%,rgba(244,63,94,0.13)_49%,rgba(244,63,94,0.07)_100%)] dark:border-rose-300/20 dark:bg-[radial-gradient(circle_at_50%_50%,rgba(30,10,20,0.95),rgba(100,20,52,0.46)_50%,rgba(251,113,133,0.13)_51%,rgba(251,113,133,0.05)_100%)]",
    body: "bg-rose-950 dark:bg-rose-50",
    pads: ["bg-rose-500", "bg-orange-400", "bg-fuchsia-400"],
  },
  {
    shell:
      "border-cyan-100 bg-[radial-gradient(circle_at_50%_50%,rgba(240,253,250,0.96),rgba(207,250,254,0.72)_48%,rgba(6,182,212,0.13)_49%,rgba(20,184,166,0.07)_100%)] dark:border-cyan-300/20 dark:bg-[radial-gradient(circle_at_50%_50%,rgba(8,24,28,0.95),rgba(20,83,90,0.48)_50%,rgba(45,212,191,0.13)_51%,rgba(45,212,191,0.05)_100%)]",
    body: "bg-cyan-950 dark:bg-cyan-50",
    pads: ["bg-cyan-500", "bg-lime-400", "bg-violet-400"],
  },
];

const SPINNER_DESIGNS = ["tri-wing", "barbell", "orbit"] as const;

export function SpinnerToy({
  seed,
  isSoundEnabled,
}: {
  seed: number;
  isSoundEnabled: boolean;
}) {
  const variant = useMemo(() => {
    const random = createSeededRandom(seed);
    return {
      design: random.pick(SPINNER_DESIGNS),
      palette: random.pick(SPINNER_PALETTES),
      offset: random.int(360),
    };
  }, [seed]);
  const [spin, setSpin] = useState(0);

  return (
    <button
      type="button"
      onClick={() => {
        if (isSoundEnabled) {
          playFidgetSpinSound();
        }
        setSpin((current) => current + 720);
      }}
      className={`mx-auto grid h-36 w-36 place-items-center rounded-full border transition hover:scale-[1.02] ${variant.palette.shell}`}
      aria-label="Spin fidget spinner"
    >
      <span
        className="relative block h-24 w-24 rounded-full transition-transform duration-1000 ease-out motion-reduce:duration-100"
        style={{ transform: `rotate(${spin + variant.offset}deg)` }}
      >
        {variant.design === "barbell" ? (
          <>
            <span
              className={`absolute left-1/2 top-1/2 h-5 w-20 origin-left -translate-y-1/2 rounded-full shadow-sm ${variant.palette.body}`}
            />
            <span
              className={`absolute right-1/2 top-1/2 h-5 w-20 origin-right -translate-y-1/2 rounded-full shadow-sm ${variant.palette.body}`}
            />
            <span
              className={`absolute left-0 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full shadow-md ring-4 ring-white dark:ring-slate-950 ${variant.palette.pads[0]}`}
            />
            <span
              className={`absolute right-0 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full shadow-md ring-4 ring-white dark:ring-slate-950 ${variant.palette.pads[1]}`}
            />
          </>
        ) : variant.design === "orbit" ? (
          <>
            <span
              className={`absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-[10px] shadow-sm ${variant.palette.body}`}
            />
            <span
              className={`absolute left-1/2 top-0 h-10 w-10 -translate-x-1/2 rounded-full shadow-md ring-4 ring-white dark:ring-slate-950 ${variant.palette.pads[0]}`}
            />
            <span
              className={`absolute bottom-0 left-1/2 h-10 w-10 -translate-x-1/2 rounded-full shadow-md ring-4 ring-white dark:ring-slate-950 ${variant.palette.pads[1]}`}
            />
            <span
              className={`absolute left-0 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full shadow-md ring-4 ring-white dark:ring-slate-950 ${variant.palette.pads[2]}`}
            />
          </>
        ) : (
          <>
            <span
              className={`absolute left-1/2 top-1/2 h-4 w-16 origin-left -translate-y-1/2 rounded-full shadow-sm ${variant.palette.body}`}
            />
            <span
              className={`absolute left-1/2 top-1/2 h-4 w-16 origin-left -translate-y-1/2 rotate-[120deg] rounded-full shadow-sm ${variant.palette.body}`}
            />
            <span
              className={`absolute left-1/2 top-1/2 h-4 w-16 origin-left -translate-y-1/2 rotate-[240deg] rounded-full shadow-sm ${variant.palette.body}`}
            />
            <span
              className={`absolute left-1/2 top-0 h-11 w-11 -translate-x-1/2 rounded-full shadow-md ring-4 ring-white dark:ring-slate-950 ${variant.palette.pads[0]}`}
            />
            <span
              className={`absolute bottom-2 left-0 h-11 w-11 rounded-full shadow-md ring-4 ring-white dark:ring-slate-950 ${variant.palette.pads[1]}`}
            />
            <span
              className={`absolute bottom-2 right-0 h-11 w-11 rounded-full shadow-md ring-4 ring-white dark:ring-slate-950 ${variant.palette.pads[2]}`}
            />
          </>
        )}
        <span
          className={`absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-[6px] border-white shadow-md dark:border-slate-950 ${variant.palette.body}`}
        />
        <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white dark:bg-slate-950" />
      </span>
    </button>
  );
}
