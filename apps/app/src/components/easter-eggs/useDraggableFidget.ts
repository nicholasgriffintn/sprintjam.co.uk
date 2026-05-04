import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

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
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef<Position>({ x: 0, y: 0 });

  const updatePosition = useCallback(
    (nextPosition: Position) => {
      const viewportPosition = keepInViewport(nextPosition, bounds);
      setPosition(viewportPosition);
      onPositionChange?.(viewportPosition);
    },
    [bounds, onPositionChange],
  );

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handleMove = (event: PointerEvent) => {
      updatePosition({
        x: event.clientX - dragOffsetRef.current.x,
        y: event.clientY - dragOffsetRef.current.y,
      });
    };
    const handleUp = () => setIsDragging(false);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [isDragging, updatePosition]);

  const startDrag = (
    event: ReactPointerEvent<HTMLButtonElement | HTMLDivElement>,
  ) => {
    event.preventDefault();
    dragOffsetRef.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };
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

  return { position, isDragging, startDrag, moveBy };
}
