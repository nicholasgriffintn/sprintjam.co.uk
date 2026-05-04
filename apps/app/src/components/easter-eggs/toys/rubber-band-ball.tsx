import {
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { playFidgetRubberBandSound } from "@/lib/fidget-audio";

const MAX_PULL = 58;
const KEY_PULL_STEP = 8;
const RECOIL_MS = 180;

const clampPull = (value: number) =>
  Math.max(-MAX_PULL, Math.min(MAX_PULL, value));

export function RubberBandBallToy({
  isSoundEnabled,
}: {
  isSoundEnabled: boolean;
}) {
  const [pull, setPull] = useState({ x: 0, y: 0 });
  const [recoil, setRecoil] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const padRef = useRef<HTMLDivElement | null>(null);
  const pullRef = useRef(pull);
  const recoilTimerRef = useRef<number | undefined>(undefined);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    pullRef.current = pull;
  }, [pull]);

  useEffect(
    () => () => {
      if (typeof window !== "undefined") {
        window.clearTimeout(recoilTimerRef.current);
      }
    },
    [],
  );

  const releasePull = () => {
    const releasedPull = pullRef.current;
    const strength = Math.min(1, Math.hypot(releasedPull.x, releasedPull.y) / MAX_PULL);
    if (isSoundEnabled && strength > 0.08) {
      playFidgetRubberBandSound(strength);
    }
    setPull({ x: 0, y: 0 });
    window.clearTimeout(recoilTimerRef.current);
    if (!prefersReducedMotion && strength > 0.08) {
      setRecoil({
        x: -releasedPull.x * 0.42,
        y: -releasedPull.y * 0.42,
      });
      recoilTimerRef.current = window.setTimeout(() => {
        setRecoil({ x: 0, y: 0 });
      }, RECOIL_MS);
    }
    setIsDragging(false);
  };

  const updateFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!padRef.current) {
      return;
    }

    const rect = padRef.current.getBoundingClientRect();
    setRecoil({ x: 0, y: 0 });
    setPull({
      x: clampPull(event.clientX - (rect.left + rect.width / 2)),
      y: clampPull(event.clientY - (rect.top + rect.height / 2)),
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keyOffsets: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -KEY_PULL_STEP, y: 0 },
      ArrowRight: { x: KEY_PULL_STEP, y: 0 },
      ArrowUp: { x: 0, y: -KEY_PULL_STEP },
      ArrowDown: { x: 0, y: KEY_PULL_STEP },
      Home: { x: -pull.x, y: -pull.y },
      Enter: { x: -pull.x, y: -pull.y },
      " ": { x: -pull.x, y: -pull.y },
    };
    const offset = keyOffsets[event.key];

    if (!offset) {
      return;
    }

    event.preventDefault();
    if (event.key === "Enter" || event.key === " ") {
      releasePull();
      return;
    }

    setRecoil({ x: 0, y: 0 });
    setPull((current) => ({
      x: clampPull(current.x + offset.x),
      y: clampPull(current.y + offset.y),
    }));
  };

  const stretch = Math.min(1, Math.hypot(pull.x, pull.y) / MAX_PULL);
  const ballOffset = {
    x: pull.x + recoil.x,
    y: pull.y + recoil.y,
  };
  const recoilStrength = Math.min(1, Math.hypot(recoil.x, recoil.y) / MAX_PULL);
  const visibleStretch = Math.max(stretch, recoilStrength * 0.7);

  return (
    <div
      ref={padRef}
      role="slider"
      tabIndex={0}
      aria-label="Pull the rubber band ball"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(stretch * 100)}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setIsDragging(true);
        updateFromPointer(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          updateFromPointer(event);
        }
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        releasePull();
      }}
      onPointerCancel={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        releasePull();
      }}
      onKeyDown={handleKeyDown}
      className="relative h-44 touch-none overflow-hidden rounded-2xl border border-rose-200 bg-[radial-gradient(circle_at_50%_42%,rgba(255,241,242,0.98),rgba(254,205,211,0.48)_52%,rgba(251,113,133,0.18)_100%)] shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 dark:border-rose-300/20 dark:bg-[radial-gradient(circle_at_50%_42%,rgba(76,5,25,0.82),rgba(15,23,42,0.94)_66%,rgba(251,113,133,0.12)_100%)]"
    >
      <span className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-rose-900/10 bg-rose-950/5 shadow-inner dark:border-white/10 dark:bg-white/5" />
      <span
        className="absolute left-1/2 top-1/2 h-20 w-20 rounded-full border-[10px] border-rose-500/80 opacity-70 shadow-[inset_0_0_14px_rgba(136,19,55,0.28)] transition-transform duration-200 motion-reduce:transition-none dark:border-rose-300/70"
        style={{
          transform: `translate(-50%, -50%) translate(${ballOffset.x / 4}px, ${ballOffset.y / 4}px) scale(${1 + visibleStretch * 0.18}, ${1 - visibleStretch * 0.1})`,
        }}
      />
      <span
        className="absolute left-1/2 top-1/2 h-16 w-16 rounded-full border border-white/80 bg-[radial-gradient(circle_at_34%_26%,white,rgb(251,113,133)_46%,rgb(136,19,55)_100%)] shadow-[0_16px_28px_rgba(136,19,55,0.28),inset_0_10px_16px_rgba(255,255,255,0.28)] transition-transform duration-200 motion-reduce:transition-none"
        style={{
          transform: `translate(-50%, -50%) translate(${ballOffset.x}px, ${ballOffset.y}px) scale(${1 + visibleStretch * 0.08}, ${1 - visibleStretch * 0.06})`,
          transitionDuration:
            !isDragging && !prefersReducedMotion ? "260ms" : undefined,
        }}
      />
      <span
        className="absolute left-1/2 top-1/2 h-1 origin-left rounded-full bg-rose-700/35 transition-transform duration-200 motion-reduce:transition-none dark:bg-rose-200/35"
        style={{
          width: `${Math.max(18, Math.hypot(pull.x, pull.y))}px`,
          transform: `translate(0, -50%) rotate(${Math.atan2(pull.y, pull.x)}rad)`,
          opacity: stretch > 0.05 ? 1 : 0,
        }}
        aria-hidden="true"
      />
    </div>
  );
}
