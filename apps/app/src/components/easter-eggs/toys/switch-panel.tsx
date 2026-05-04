import { useState } from "react";

import { cn } from "@/lib/cn";
import { playFidgetSwitchSound } from "@/lib/fidget-audio";

const SWITCHES = [
  { label: "Top switch", tone: "bg-emerald-400" },
  { label: "Middle switch", tone: "bg-sky-400" },
  { label: "Low switch", tone: "bg-amber-400" },
  { label: "Side switch", tone: "bg-rose-400" },
];

export function SwitchPanelToy({
  isSoundEnabled,
}: {
  isSoundEnabled: boolean;
}) {
  const [enabledSwitches, setEnabledSwitches] = useState<Set<number>>(
    () => new Set([1]),
  );

  const toggleSwitch = (index: number) => {
    setEnabledSwitches((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      if (isSoundEnabled) {
        playFidgetSwitchSound(next.has(index));
      }
      return next;
    });
  };

  return (
    <div className="space-y-2 rounded-2xl bg-slate-950 p-3 shadow-inner dark:bg-black/40">
      {SWITCHES.map((switchItem, index) => {
        const isOn = enabledSwitches.has(index);
        return (
          <button
            key={switchItem.label}
            type="button"
            role="switch"
            aria-checked={isOn}
            aria-label={switchItem.label}
            onClick={() => toggleSwitch(index)}
            className={cn(
              "flex h-9 w-full items-center rounded-full border px-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
              isOn
                ? "border-white/30 bg-white/20"
                : "border-white/10 bg-white/5",
            )}
          >
            <span
              className={cn(
                "h-6 w-6 rounded-full shadow-[0_6px_14px_rgba(0,0,0,0.28)] transition-transform motion-reduce:transition-none",
                switchItem.tone,
                isOn ? "translate-x-28" : "translate-x-0",
              )}
            />
            <span className="sr-only">{isOn ? "On" : "Off"}</span>
          </button>
        );
      })}
    </div>
  );
}
