import { useState } from "react";

import { cn } from "@/lib/cn";
import { playFidgetBeadSound } from "@/lib/fidget-audio";

const ROWS = [
  { label: "Top row", beadCount: 4, tone: "bg-rose-400" },
  { label: "Second row", beadCount: 5, tone: "bg-amber-400" },
  { label: "Third row", beadCount: 4, tone: "bg-emerald-400" },
  { label: "Bottom row", beadCount: 5, tone: "bg-sky-400" },
];

export function MiniAbacusToy({ isSoundEnabled }: { isSoundEnabled: boolean }) {
  const [positions, setPositions] = useState(() =>
    ROWS.map((row) => Math.floor(row.beadCount / 2)),
  );

  const moveBead = (rowIndex: number, beadIndex: number) => {
    setPositions((current) => {
      const next = [...current];
      next[rowIndex] = beadIndex;
      if (isSoundEnabled && current[rowIndex] !== beadIndex) {
        playFidgetBeadSound(beadIndex);
      }
      return next;
    });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 shadow-inner dark:border-amber-300/20 dark:bg-amber-400/10">
      {ROWS.map((row, rowIndex) => (
        <div key={row.label} className="relative h-7">
          <div className="absolute left-1 right-1 top-1/2 h-1 -translate-y-1/2 rounded-full bg-amber-900/25 dark:bg-amber-100/25" />
          <div
            className="relative grid h-full gap-1"
            style={{
              gridTemplateColumns: `repeat(${row.beadCount}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: row.beadCount }, (_, beadIndex) => {
              const isActive = positions[rowIndex] === beadIndex;
              return (
                <button
                  key={beadIndex}
                  type="button"
                  aria-label={`${row.label} bead ${beadIndex + 1}`}
                  aria-pressed={isActive}
                  onClick={() => moveBead(rowIndex, beadIndex)}
                  className="grid place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  <span
                    className={cn(
                      "h-6 w-6 rounded-full border border-white/80 shadow-[0_7px_12px_rgba(120,53,15,0.25)] transition motion-reduce:transition-none",
                      row.tone,
                      isActive ? "scale-110" : "scale-90 opacity-55",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
