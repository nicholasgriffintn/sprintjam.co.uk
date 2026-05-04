import {
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useRef,
  useState,
} from "react";

import { playFidgetSlideSound } from "@/lib/fidget-audio";

const MAZE_POINTS = [
  { x: 12, y: 76 },
  { x: 30, y: 76 },
  { x: 30, y: 36 },
  { x: 54, y: 36 },
  { x: 54, y: 64 },
  { x: 78, y: 64 },
  { x: 78, y: 24 },
];

const getNearestPointIndex = (x: number, y: number) => {
  return MAZE_POINTS.reduce(
    (nearest, point, index) => {
      const distance = Math.hypot(point.x - x, point.y - y);
      return distance < nearest.distance ? { distance, index } : nearest;
    },
    { distance: Number.POSITIVE_INFINITY, index: 0 },
  ).index;
};

export function SliderMazeToy({
  isSoundEnabled,
}: {
  isSoundEnabled: boolean;
}) {
  const [positionIndex, setPositionIndex] = useState(0);
  const mazeRef = useRef<HTMLDivElement | null>(null);

  const setPosition = (index: number) => {
    setPositionIndex((current) => {
      if (current === index) {
        return current;
      }
      if (isSoundEnabled) {
        playFidgetSlideSound(index);
      }
      return index;
    });
  };

  const updateFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!mazeRef.current) {
      return;
    }

    const rect = mazeRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setPosition(getNearestPointIndex(x, y));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const offset = event.key === "ArrowLeft" ? -1 : 1;
    setPosition(
      Math.max(0, Math.min(MAZE_POINTS.length - 1, positionIndex + offset)),
    );
  };

  const beadPosition = MAZE_POINTS[positionIndex];

  return (
    <div
      ref={mazeRef}
      role="slider"
      tabIndex={0}
      aria-label="Slide the bead through the maze"
      aria-valuemin={0}
      aria-valuemax={MAZE_POINTS.length - 1}
      aria-valuenow={positionIndex}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
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
      }}
      onPointerCancel={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onKeyDown={handleKeyDown}
      className="relative h-40 touch-none rounded-2xl border border-cyan-200 bg-cyan-50 shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 dark:border-cyan-300/20 dark:bg-cyan-400/10"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <polyline
          points={MAZE_POINTS.map((point) => `${point.x},${point.y}`).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="12"
          className="text-white/95 dark:text-cyan-950/70"
        />
        <polyline
          points={MAZE_POINTS.map((point) => `${point.x},${point.y}`).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
          className="text-cyan-300 dark:text-cyan-300/70"
        />
      </svg>
      <span
        className="absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-cyan-500 shadow-[0_10px_20px_rgba(14,116,144,0.35)] transition-[left,top] motion-reduce:transition-none dark:border-slate-950"
        style={{
          left: `${beadPosition.x}%`,
          top: `${beadPosition.y}%`,
        }}
      />
    </div>
  );
}
