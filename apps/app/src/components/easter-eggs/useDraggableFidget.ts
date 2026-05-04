import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

type Position = {
  x: number;
  y: number;
};

type DragBounds = {
  width: number;
  height: number;
};

const DEFAULT_DRAG_BOUNDS: DragBounds = { width: 220, height: 180 };
const MIN_DRAG_POSITION: Position = { x: 12, y: 72 };
const RELEASE_INERTIA_MS = 180;
const RELEASE_SETTLE_MS = 180;
const MAX_RELEASE_GLIDE = 64;
const MIN_RELEASE_VELOCITY = 0.08;

const keepInViewport = (position: Position, bounds: DragBounds) => {
  if (typeof window === "undefined") {
    return position;
  }

  const maxX = Math.max(MIN_DRAG_POSITION.x, window.innerWidth - bounds.width);
  const maxY = Math.max(MIN_DRAG_POSITION.y, window.innerHeight - bounds.height);

  return {
    x: Math.min(Math.max(position.x, MIN_DRAG_POSITION.x), maxX),
    y: Math.min(Math.max(position.y, MIN_DRAG_POSITION.y), maxY),
  };
};

export function useDraggableFidget(
  initialPosition: Position,
  bounds: DragBounds = DEFAULT_DRAG_BOUNDS,
  onPositionChange?: (position: Position) => void,
) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const dragOffsetRef = useRef<Position>({ x: 0, y: 0 });
  const initialPositionRef = useRef(initialPosition);
  const positionRef = useRef(initialPosition);
  const lastPointerRef = useRef<Position & { time: number }>({
    ...initialPosition,
    time: 0,
  });
  const releaseVelocityRef = useRef<Position>({ x: 0, y: 0 });
  const settleTimerRef = useRef<number | undefined>(undefined);

  const queueSettle = useCallback(() => {
    if (prefersReducedMotion || typeof window === "undefined") {
      setIsSettling(false);
      return;
    }

    window.clearTimeout(settleTimerRef.current);
    setIsSettling(true);
    settleTimerRef.current = window.setTimeout(() => {
      setIsSettling(false);
    }, RELEASE_SETTLE_MS);
  }, [prefersReducedMotion]);

  const updatePosition = useCallback(
    (nextPosition: Position) => {
      const viewportPosition = keepInViewport(nextPosition, bounds);
      positionRef.current = viewportPosition;
      setPosition(viewportPosition);
      onPositionChange?.(viewportPosition);
    },
    [bounds, onPositionChange],
  );

  useEffect(
    () => () => {
      if (typeof window !== "undefined") {
        window.clearTimeout(settleTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handleMove = (event: PointerEvent) => {
      const now = performance.now();
      const lastPointer = lastPointerRef.current;
      const elapsed = Math.max(now - lastPointer.time, 1);
      releaseVelocityRef.current = {
        x: (event.clientX - lastPointer.x) / elapsed,
        y: (event.clientY - lastPointer.y) / elapsed,
      };
      lastPointerRef.current = {
        x: event.clientX,
        y: event.clientY,
        time: now,
      };
      updatePosition({
        x: event.clientX - dragOffsetRef.current.x,
        y: event.clientY - dragOffsetRef.current.y,
      });
    };
    const handleUp = () => {
      setIsDragging(false);

      if (prefersReducedMotion) {
        return;
      }

      const velocity = releaseVelocityRef.current;
      const releaseSpeed = Math.hypot(velocity.x, velocity.y);

      if (releaseSpeed < MIN_RELEASE_VELOCITY) {
        queueSettle();
        return;
      }

      updatePosition({
        x:
          positionRef.current.x +
          Math.max(
            -MAX_RELEASE_GLIDE,
            Math.min(MAX_RELEASE_GLIDE, velocity.x * RELEASE_INERTIA_MS),
          ),
        y:
          positionRef.current.y +
          Math.max(
            -MAX_RELEASE_GLIDE,
            Math.min(MAX_RELEASE_GLIDE, velocity.y * RELEASE_INERTIA_MS),
          ),
      });
      queueSettle();
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [isDragging, prefersReducedMotion, queueSettle, updatePosition]);

  const startDrag = (
    event: ReactPointerEvent<HTMLButtonElement | HTMLDivElement>,
  ) => {
    event.preventDefault();
    window.clearTimeout(settleTimerRef.current);
    setIsSettling(false);
    dragOffsetRef.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };
    lastPointerRef.current = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
    };
    releaseVelocityRef.current = { x: 0, y: 0 };
    setIsDragging(true);
  };

  const moveBy = useCallback(
    (delta: Position) => {
      updatePosition({
        x: position.x + delta.x,
        y: position.y + delta.y,
      });
    },
    [position.x, position.y, updatePosition],
  );

  const resetPosition = useCallback(() => {
    updatePosition(initialPositionRef.current);
    queueSettle();
  }, [queueSettle, updatePosition]);

  return { position, isDragging, isSettling, startDrag, moveBy, resetPosition };
}
