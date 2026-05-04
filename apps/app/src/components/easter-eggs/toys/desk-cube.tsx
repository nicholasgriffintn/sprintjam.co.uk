import {
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/cn";
import { playFidgetBeadSound, playFidgetSwitchSound } from "@/lib/fidget-audio";
import { createSeededRandom } from "@/lib/seeded-random";

const FACE_COUNT = 4;
const GEAR_STEP = 30;

export function DeskCubeToy({
  seed,
  isSoundEnabled,
}: {
  seed: number;
  isSoundEnabled: boolean;
}) {
  const palette = useMemo(() => {
    const random = createSeededRandom(seed);
    return random.pick([
      {
        shell: "from-slate-200 via-slate-100 to-sky-100",
        darkShell: "dark:from-slate-800 dark:via-slate-900 dark:to-sky-950",
        accent: "bg-sky-400",
        ring: "focus-visible:ring-sky-300",
      },
      {
        shell: "from-emerald-100 via-teal-50 to-cyan-100",
        darkShell: "dark:from-emerald-950 dark:via-slate-900 dark:to-cyan-950",
        accent: "bg-emerald-400",
        ring: "focus-visible:ring-emerald-300",
      },
      {
        shell: "from-amber-100 via-orange-50 to-rose-100",
        darkShell: "dark:from-amber-950 dark:via-slate-900 dark:to-rose-950",
        accent: "bg-amber-400",
        ring: "focus-visible:ring-amber-300",
      },
    ]);
  }, [seed]);
  const [faceIndex, setFaceIndex] = useState(0);
  const [isSwitchOn, setIsSwitchOn] = useState(false);
  const [pressedButtons, setPressedButtons] = useState<Set<number>>(
    () => new Set(),
  );
  const [gearRotation, setGearRotation] = useState(0);
  const dragStartXRef = useRef(0);
  const dragStartFaceRef = useRef(0);

  const setFace = (nextFace: number) => {
    setFaceIndex((nextFace + FACE_COUNT) % FACE_COUNT);
  };

  const rotateBy = (offset: number) => {
    setFace(faceIndex + offset);
    if (isSoundEnabled) {
      playFidgetBeadSound(Math.abs(offset));
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartXRef.current = event.clientX;
    dragStartFaceRef.current = faceIndex;
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    const faceOffset = Math.round((dragStartXRef.current - event.clientX) / 48);
    setFace(dragStartFaceRef.current + faceOffset);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    rotateBy(event.key === "ArrowLeft" ? -1 : 1);
  };

  const toggleSwitch = () => {
    setIsSwitchOn((current) => {
      if (isSoundEnabled) {
        playFidgetSwitchSound(!current);
      }
      return !current;
    });
  };

  const pressButton = (buttonIndex: number) => {
    setPressedButtons((current) => {
      const next = new Set(current);
      if (next.has(buttonIndex)) {
        next.delete(buttonIndex);
      } else {
        next.add(buttonIndex);
      }
      return next;
    });
    if (isSoundEnabled) {
      playFidgetBeadSound(buttonIndex);
    }
  };

  const turnGear = () => {
    setGearRotation((current) => current + GEAR_STEP);
    if (isSoundEnabled) {
      playFidgetBeadSound(gearRotation / GEAR_STEP);
    }
  };
  const activeFace = faceIndex % FACE_COUNT;

  return (
    <div
      role="group"
      tabIndex={0}
      aria-label="Rotate desk cube"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative h-44 touch-none overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br p-3 shadow-inner focus-visible:outline-none focus-visible:ring-2 dark:border-white/10",
        palette.shell,
        palette.darkShell,
        palette.ring,
      )}
    >
      <div className="grid h-full grid-rows-[1fr_auto] gap-2">
        <div className="relative grid place-items-center overflow-visible">
          <div className="relative h-28 w-32">
            <div
              className="absolute left-6 top-4 z-0 h-24 w-[5.75rem] rounded-2xl border border-slate-500/20 bg-slate-900/14 shadow-[inset_8px_0_14px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-black/24"
              aria-hidden="true"
            />
            <div className="absolute left-3 top-5 z-10 h-24 w-24 rounded-2xl border border-white/75 bg-white/76 p-3 shadow-[0_12px_20px_rgba(15,23,42,0.24),inset_0_10px_16px_rgba(255,255,255,0.44)] transition-transform duration-200 motion-reduce:transition-none dark:border-white/10 dark:bg-slate-950/58">
              {activeFace === 0 ? (
                <div className="grid h-full grid-cols-2 gap-2">
                  {[0, 1, 2, 3].map((buttonIndex) => (
                    <button
                      key={buttonIndex}
                      type="button"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => pressButton(buttonIndex)}
                      className={cn(
                        "rounded-xl border border-white/70 shadow-[0_8px_12px_rgba(15,23,42,0.16)] transition focus-visible:outline-none focus-visible:ring-2 motion-reduce:transition-none",
                        palette.ring,
                        pressedButtons.has(buttonIndex)
                          ? "translate-y-1 bg-slate-400 shadow-inner dark:bg-slate-500"
                          : palette.accent,
                      )}
                      aria-label={`Desk cube button ${buttonIndex + 1}`}
                      aria-pressed={pressedButtons.has(buttonIndex)}
                    />
                  ))}
                </div>
              ) : activeFace === 1 ? (
                <button
                  type="button"
                  role="switch"
                  aria-label="Desk cube switch"
                  aria-checked={isSwitchOn}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={toggleSwitch}
                  className={cn(
                    "relative h-full w-full rounded-2xl border border-white/70 bg-slate-900/10 p-2 shadow-inner focus-visible:outline-none focus-visible:ring-2 dark:bg-white/10",
                    palette.ring,
                  )}
                >
                  <span className="absolute inset-x-4 top-1/2 h-12 -translate-y-1/2 rounded-full bg-slate-900/15 shadow-inner dark:bg-white/10" />
                  <span
                    className={cn(
                      "absolute top-1/2 h-11 w-8 -translate-y-1/2 rounded-full border border-white/80 shadow-[0_8px_12px_rgba(15,23,42,0.18)] transition-[left,background-color] motion-reduce:transition-none",
                      isSwitchOn ? "left-[52%]" : "left-[22%]",
                      isSwitchOn ? palette.accent : "bg-slate-300",
                    )}
                  />
                </button>
              ) : activeFace === 2 ? (
                <button
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={turnGear}
                  className={cn(
                    "grid h-full w-full place-items-center rounded-2xl border border-white/70 bg-white/45 shadow-inner focus-visible:outline-none focus-visible:ring-2 dark:bg-white/10",
                    palette.ring,
                  )}
                  aria-label="Turn desk cube gear"
                >
                  <span
                    className="h-16 w-16 rounded-full border-[10px] border-dashed border-slate-600 bg-slate-200 shadow-[inset_0_8px_12px_rgba(255,255,255,0.6)] transition-transform duration-200 motion-reduce:transition-none dark:border-slate-200 dark:bg-slate-700"
                    style={{ transform: `rotate(${gearRotation}deg)` }}
                  />
                </button>
              ) : (
                <div className="grid h-full grid-cols-3 items-center gap-2">
                  {[0, 1, 2].map((sliderIndex) => (
                    <button
                      key={sliderIndex}
                      type="button"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => pressButton(sliderIndex + 4)}
                      className="relative h-full rounded-full bg-slate-900/10 shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:bg-white/10"
                      aria-label={`Desk cube rail ${sliderIndex + 1}`}
                      aria-pressed={pressedButtons.has(sliderIndex + 4)}
                    >
                      <span
                        className={cn(
                          "absolute left-1/2 h-7 w-7 -translate-x-1/2 rounded-full border border-white/80 shadow-md transition-[top] motion-reduce:transition-none",
                          palette.accent,
                          pressedButtons.has(sliderIndex + 4)
                            ? "top-[64%]"
                            : "top-[16%]",
                        )}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-full border border-white/60 bg-white/65 px-2 py-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/45">
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => rotateBy(-1)}
            className="grid h-7 w-7 place-items-center rounded-full bg-white/80 text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:bg-white/10 dark:text-white"
            aria-label="Rotate desk cube left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div
            className="flex min-w-0 items-center justify-center gap-1"
            aria-hidden="true"
          >
            {Array.from({ length: FACE_COUNT }, (_, index) => (
              <span
                key={index}
                className={cn(
                  "h-1.5 w-4 rounded-full",
                  index === faceIndex ? palette.accent : "bg-slate-300/80",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => rotateBy(1)}
            className="grid h-7 w-7 place-items-center rounded-full bg-white/80 text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:bg-white/10 dark:text-white"
            aria-label="Rotate desk cube right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
