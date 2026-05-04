import {
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/cn";
import { playFidgetMagnetSound } from "@/lib/fidget-audio";
import { createSeededRandom } from "@/lib/seeded-random";

type MagnetBall = {
  id: number;
  x: number;
  y: number;
  tone: string;
};

const BALL_COUNT = 10;
const MAGNET_RADIUS = 34;
const CLUSTER_SPACING = 9;
const MAGNET_TONES = [
  "bg-sky-400",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-rose-400",
  "bg-violet-400",
];

const clampPercent = (value: number) => Math.max(10, Math.min(90, value));

const getDistance = (first: MagnetBall, second: Pick<MagnetBall, "x" | "y">) =>
  Math.hypot(first.x - second.x, first.y - second.y);

const createMagnetBalls = (seed: number) => {
  const random = createSeededRandom(seed);

  return Array.from({ length: BALL_COUNT }, (_, index) => {
    const row = Math.floor(index / 5);
    const column = index % 5;

    return {
      id: index,
      x: 18 + column * 16 + random.int(7) - 3,
      y: 34 + row * 26 + random.int(7) - 3,
      tone: random.pick(MAGNET_TONES),
    };
  });
};

export function MagnetBallsToy({
  seed,
  isSoundEnabled,
}: {
  seed: number;
  isSoundEnabled: boolean;
}) {
  const initialBalls = useMemo(() => createMagnetBalls(seed), [seed]);
  const [balls, setBalls] = useState<MagnetBall[]>(initialBalls);
  const [activeBallId, setActiveBallId] = useState(0);
  const [draggingBallId, setDraggingBallId] = useState<number | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const boardRectRef = useRef<DOMRect | null>(null);

  const moveBall = (ballId: number, x: number, y: number) => {
    const activePosition = { x: clampPercent(x), y: clampPercent(y) };

    setBalls((current) =>
      current.map((ball) =>
        ball.id === ballId ? { ...ball, ...activePosition } : ball,
      ),
    );
  };

  const updateFromPointer = (
    event: ReactPointerEvent<HTMLButtonElement>,
    ballId: number,
  ) => {
    const rect = boardRectRef.current;

    if (!rect) {
      return;
    }

    moveBall(
      ballId,
      ((event.clientX - rect.left) / rect.width) * 100,
      ((event.clientY - rect.top) / rect.height) * 100,
    );
  };

  const selectBall = (ballId: number) => {
    setActiveBallId(ballId);
    if (isSoundEnabled) {
      playFidgetMagnetSound(ballId);
    }
  };

  const snapCluster = (ballId: number) => {
    setDraggingBallId(null);
    setBalls((current) => {
      const activeBall = current.find((ball) => ball.id === ballId);

      if (!activeBall) {
        return current;
      }

      const cluster = current
        .filter(
          (ball) =>
            ball.id !== ballId && getDistance(ball, activeBall) < MAGNET_RADIUS,
        )
        .sort(
          (first, second) =>
            getDistance(first, activeBall) - getDistance(second, activeBall),
        );
      const offsets = [
        { x: -CLUSTER_SPACING, y: 0 },
        { x: CLUSTER_SPACING, y: 0 },
        { x: 0, y: -CLUSTER_SPACING },
        { x: 0, y: CLUSTER_SPACING },
        { x: -CLUSTER_SPACING, y: -CLUSTER_SPACING },
        { x: CLUSTER_SPACING, y: CLUSTER_SPACING },
      ];

      return current.map((ball) => {
        if (ball.id === ballId) {
          return ball;
        }

        const clusterIndex = cluster.findIndex(
          (clusterBall) => clusterBall.id === ball.id,
        );

        if (clusterIndex === -1) {
          return ball;
        }

        const offset = offsets[clusterIndex % offsets.length]!;

        return {
          ...ball,
          x: clampPercent(activeBall.x + offset.x),
          y: clampPercent(activeBall.y + offset.y),
        };
      });
    });
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    ballId: number,
  ) => {
    const keyOffsets: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -6, y: 0 },
      ArrowRight: { x: 6, y: 0 },
      ArrowUp: { x: 0, y: -6 },
      ArrowDown: { x: 0, y: 6 },
    };
    const offset = keyOffsets[event.key];

    if (!offset) {
      return;
    }

    event.preventDefault();
    setActiveBallId(ballId);
    const activeBall = balls.find((ball) => ball.id === ballId);
    if (activeBall) {
      moveBall(ballId, activeBall.x + offset.x, activeBall.y + offset.y);
    }
    if (isSoundEnabled) {
      playFidgetMagnetSound(ballId);
    }
  };

  return (
    <div
      ref={boardRef}
      className="relative h-44 touch-none overflow-hidden rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_48%_42%,rgba(255,255,255,0.98),rgba(226,232,240,0.86)_48%,rgba(148,163,184,0.22)_100%)] shadow-inner dark:border-white/10 dark:bg-[radial-gradient(circle_at_48%_42%,rgba(51,65,85,0.95),rgba(15,23,42,0.94)_62%,rgba(148,163,184,0.14)_100%)]"
      role="group"
      aria-label="Arrange magnet balls"
    >
      {balls.map((ball) => (
        <button
          key={ball.id}
          type="button"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            boardRectRef.current =
              boardRef.current?.getBoundingClientRect() ?? null;
            setDraggingBallId(ball.id);
            selectBall(ball.id);
            updateFromPointer(event, ball.id);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              updateFromPointer(event, ball.id);
            }
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
            snapCluster(ball.id);
          }}
          onPointerCancel={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
            snapCluster(ball.id);
          }}
          onKeyDown={(event) => handleKeyDown(event, ball.id)}
          onClick={() => selectBall(ball.id)}
          className={cn(
            "absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 active:cursor-grabbing",
            draggingBallId === ball.id
              ? "z-10"
              : "transition-[left,top] duration-150 ease-out motion-reduce:transition-none",
          )}
          style={{ left: `${ball.x}%`, top: `${ball.y}%` }}
          aria-label={`Magnet ball ${ball.id + 1}`}
        >
          <span
            className={cn(
              "block h-full w-full rounded-full border border-white/80 shadow-[0_10px_16px_rgba(15,23,42,0.24),inset_0_8px_10px_rgba(255,255,255,0.32)] transition motion-reduce:transition-none",
              ball.tone,
              activeBallId === ball.id
                ? "scale-110 ring-2 ring-slate-900/20 dark:ring-white/35"
                : "scale-95",
            )}
          />
        </button>
      ))}
    </div>
  );
}
