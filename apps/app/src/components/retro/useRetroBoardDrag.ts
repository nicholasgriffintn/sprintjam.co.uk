import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  getRetroBoardDropTargetFromElement,
  getRetroBoardDropTargetKey,
  type RetroBoardDragPayload,
  type RetroBoardDropTarget,
} from "./retro-board-dnd";

interface UseRetroBoardDragOptions {
  isEnabled: boolean;
  onDrop: (
    target: RetroBoardDropTarget,
    payload: RetroBoardDragPayload,
  ) => void;
}

export function useRetroBoardDrag({
  isEnabled,
  onDrop,
}: UseRetroBoardDragOptions) {
  const documentRef = useRef<Document | null>(null);
  const payloadRef = useRef<RetroBoardDragPayload | null>(null);
  const [activeDragPayload, setActiveDragPayload] =
    useState<RetroBoardDragPayload | null>(null);
  const [activeDropTargetKey, setActiveDropTargetKey] = useState<string | null>(
    null,
  );

  const resetDrag = useCallback(() => {
    payloadRef.current = null;
    documentRef.current = null;
    setActiveDragPayload(null);
    setActiveDropTargetKey(null);
  }, []);

  const updateDropTarget = useCallback((clientX: number, clientY: number) => {
    const element = documentRef.current?.elementFromPoint(clientX, clientY);
    const target = getRetroBoardDropTargetFromElement(element ?? null);
    setActiveDropTargetKey(target ? getRetroBoardDropTargetKey(target) : null);
    return target;
  }, []);

  const startPointerDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>, payload: RetroBoardDragPayload) => {
      if (!isEnabled || event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      documentRef.current = event.currentTarget.ownerDocument;
      payloadRef.current = payload;
      setActiveDragPayload(payload);
      updateDropTarget(event.clientX, event.clientY);
    },
    [isEnabled, updateDropTarget],
  );

  useEffect(() => {
    const activeDocument = documentRef.current;
    if (!activeDragPayload || !activeDocument) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      updateDropTarget(event.clientX, event.clientY);
    };

    const handlePointerUp = (event: PointerEvent) => {
      event.preventDefault();
      const payload = payloadRef.current;
      const target = updateDropTarget(event.clientX, event.clientY);
      resetDrag();

      if (payload && target) {
        onDrop(target, payload);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        resetDrag();
      }
    };

    activeDocument.addEventListener("pointermove", handlePointerMove);
    activeDocument.addEventListener("pointerup", handlePointerUp);
    activeDocument.addEventListener("keydown", handleKeyDown);

    return () => {
      activeDocument.removeEventListener("pointermove", handlePointerMove);
      activeDocument.removeEventListener("pointerup", handlePointerUp);
      activeDocument.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeDragPayload, onDrop, resetDrag, updateDropTarget]);

  return {
    activeDragPayload,
    activeDropTargetKey,
    resetDrag,
    startPointerDrag,
  };
}
