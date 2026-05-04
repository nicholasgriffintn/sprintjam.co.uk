import {
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import { playFidgetSlideSound } from "@/lib/fidget-audio";
import { createSeededRandom } from "@/lib/seeded-random";

type MazePoint = {
  x: number;
  y: number;
};

const MAZE_TEMPLATES: MazePoint[][] = [
  [
    { x: 12, y: 76 },
    { x: 30, y: 76 },
    { x: 30, y: 36 },
    { x: 54, y: 36 },
    { x: 54, y: 64 },
    { x: 78, y: 64 },
    { x: 78, y: 24 },
  ],
  [
    { x: 14, y: 24 },
    { x: 14, y: 58 },
    { x: 38, y: 58 },
    { x: 38, y: 78 },
    { x: 62, y: 78 },
    { x: 62, y: 38 },
    { x: 86, y: 38 },
  ],
  [
    { x: 16, y: 82 },
    { x: 16, y: 48 },
    { x: 40, y: 48 },
    { x: 40, y: 22 },
    { x: 66, y: 22 },
    { x: 66, y: 70 },
    { x: 84, y: 70 },
  ],
  [
    { x: 12, y: 52 },
    { x: 30, y: 52 },
    { x: 30, y: 24 },
    { x: 50, y: 24 },
    { x: 50, y: 78 },
    { x: 74, y: 78 },
    { x: 74, y: 42 },
    { x: 88, y: 42 },
  ],
];

const MAZE_PALETTES = [
  { hue: 190, saturation: 82 },
  { hue: 158, saturation: 78 },
  { hue: 268, saturation: 76 },
  { hue: 330, saturation: 78 },
  { hue: 38, saturation: 86 },
];

const clampMazePoint = (value: number) => Math.max(10, Math.min(90, value));

const getMazeConfig = (seed: number) => {
  const random = createSeededRandom(seed);
  const template = random.pick(MAZE_TEMPLATES);
  const palette = random.pick(MAZE_PALETTES);
  const hue = (palette.hue + random.int(30) - 15 + 360) % 360;
  const points = template.map((point, index) => ({
    x:
      index === 0 || index === template.length - 1
        ? point.x
        : clampMazePoint(point.x + random.int(11) - 5),
    y:
      index === 0 || index === template.length - 1
        ? point.y
        : clampMazePoint(point.y + random.int(11) - 5),
  }));

  return {
    points,
    path: points.map((point) => `${point.x},${point.y}`).join(" "),
    colours: {
      background: `hsl(${hue} ${palette.saturation}% 94%)`,
      border: `hsl(${hue} ${palette.saturation}% 82%)`,
      groove: `hsl(${hue} ${palette.saturation}% 98%)`,
      rail: `hsl(${hue} ${palette.saturation}% 68%)`,
      bead: `hsl(${hue} ${palette.saturation}% 44%)`,
      shadow: `hsla(${hue}, ${palette.saturation}%, 28%, 0.35)`,
    },
  };
};

const FALLBACK_MAZE_POINTS = [
  { x: 12, y: 76 },
  { x: 30, y: 76 },
  { x: 30, y: 36 },
  { x: 54, y: 36 },
  { x: 54, y: 64 },
  { x: 78, y: 64 },
  { x: 78, y: 24 },
];

const getNearestPointIndex = (points: MazePoint[], x: number, y: number) => {
  return points.reduce(
    (nearest, point, index) => {
      const distance = Math.hypot(point.x - x, point.y - y);
      return distance < nearest.distance ? { distance, index } : nearest;
    },
    { distance: Number.POSITIVE_INFINITY, index: 0 },
  ).index;
};

export function SliderMazeToy({
  seed,
  isSoundEnabled,
}: {
  seed: number;
  isSoundEnabled: boolean;
}) {
  const maze = useMemo(() => getMazeConfig(seed), [seed]);
  const [positionIndex, setPositionIndex] = useState(0);
  const mazeRef = useRef<HTMLDivElement | null>(null);
  const mazePoints =
    maze.points.length > 0 ? maze.points : FALLBACK_MAZE_POINTS;

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
    setPosition(getNearestPointIndex(mazePoints, x, y));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const offset = event.key === "ArrowLeft" ? -1 : 1;
    setPosition(
      Math.max(0, Math.min(mazePoints.length - 1, positionIndex + offset)),
    );
  };

  const beadPosition = mazePoints[positionIndex] ?? mazePoints[0]!;

  return (
    <div
      ref={mazeRef}
      role="slider"
      tabIndex={0}
      aria-label="Slide the bead through the maze"
      aria-valuemin={0}
      aria-valuemax={mazePoints.length - 1}
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
      className="relative h-40 touch-none rounded-2xl border shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
      style={{
        backgroundColor: maze.colours.background,
        borderColor: maze.colours.border,
      }}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <polyline
          points={maze.path}
          fill="none"
          stroke={maze.colours.groove}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="12"
        />
        <polyline
          points={maze.path}
          fill="none"
          stroke={maze.colours.rail}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
      </svg>
      <span
        className="absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white transition-[left,top] motion-reduce:transition-none dark:border-slate-950"
        style={{
          left: `${beadPosition.x}%`,
          top: `${beadPosition.y}%`,
          backgroundColor: maze.colours.bead,
          boxShadow: `0 10px 20px ${maze.colours.shadow}`,
        }}
      />
    </div>
  );
}
