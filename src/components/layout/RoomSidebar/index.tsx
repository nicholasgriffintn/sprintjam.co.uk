import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import type { RoomStats } from "@/types";
import { ParticipantsList } from "./ParticipantsList";
import { TicketQueueSidebar } from "./TicketQueueSidebar";
import { useRoomActions, useRoomState } from "@/context/RoomContext";
import { useSessionState } from "@/context/SessionContext";

export function RoomSidebar({
  isQueueEnabled,
  stats,
  setIsQueueModalOpen,
  onOpenQueueSettings,
}: {
  isQueueEnabled: boolean;
  stats: RoomStats;
  setIsQueueModalOpen: (isOpen: boolean) => void;
  onOpenQueueSettings?: () => void;
}) {
  const { roomData, isModeratorView } = useRoomState();
  const { handleUpdateTicket, handleSelectTicket } = useRoomActions();
  const { name } = useSessionState();

  const [isParticipantsCollapsed, setIsParticipantsCollapsed] = useState(false);
  const [isQueueCollapsed, setIsQueueCollapsed] = useState(false);
  const [sidebarSplit, setSidebarSplit] = useState(0.6);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  const participantsFlex = isQueueEnabled ? sidebarSplit : 1;
  const queueFlex = isQueueEnabled ? 1 - sidebarSplit : 0;

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  const updateSidebarSplit = (clientY: number) => {
    if (!sidebarRef.current) return;
    const rect = sidebarRef.current.getBoundingClientRect();
    if (rect.height <= 0) return;
    const ratio = (clientY - rect.top) / rect.height;
    const next = clamp(ratio, 0.3, 0.8);
    if (Number.isFinite(next)) {
      setSidebarSplit(next);
    }
  };

  useEffect(() => {
    if (!isDraggingSplit) return;
    const handleMove = (event: PointerEvent) => {
      updateSidebarSplit(event.clientY);
    };
    const handleUp = () => setIsDraggingSplit(false);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [isDraggingSplit]);

  const handleSplitPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    setIsDraggingSplit(true);
    updateSidebarSplit(event.clientY);
  };

  return (
    <div className="md:relative md:min-h-0 md:h-full border-b border-white/30 dark:border-white/10 md:border-b-0 md:border-r">
      <div
        ref={sidebarRef}
        className="flex h-full min-h-0 flex-col gap-3 p-3 shadow-sm backdrop-blur md:sticky md:top-[4.5rem] md:h-[calc(100vh-4.5rem)] md:min-h-[420px]"
      >
        <div
          className={`flex flex-col overflow-hidden md:min-h-0 ${
            isParticipantsCollapsed ? "md:min-h-[54px]" : "md:min-h-[220px]"
          }`}
          style={{
            flex: isParticipantsCollapsed
              ? "0 0 auto"
              : `${participantsFlex} 1 0%`,
          }}
        >
          <ParticipantsList
            roomData={roomData}
            stats={stats}
            name={name}
            isCollapsed={isParticipantsCollapsed}
            onToggleCollapse={() => setIsParticipantsCollapsed((prev) => !prev)}
          />
        </div>

        {isQueueEnabled && (
          <>
            <button
              type="button"
              onPointerDown={handleSplitPointerDown}
              className="cursor-row-resize hidden h-4 items-center justify-center rounded-xl border border-dashed border-white/40 bg-white/70 text-[10px] uppercase tracking-wide text-slate-500 transition hover:border-brand-200 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:border-white/10 dark:bg-white/10 dark:text-slate-300 md:flex"
              aria-label="Resize sidebar sections"
            >
              <span className="h-0.5 w-10 rounded-full bg-slate-400/80 dark:bg-slate-500/80" />
            </button>
            <div
              className={`flex flex-col overflow-hidden md:min-h-0 md:pt-1 ${
                isQueueCollapsed ? "md:min-h-[54px]" : "md:min-h-[180px]"
              }`}
              style={{
                flex: isQueueCollapsed ? "0 0 auto" : `${queueFlex} 1 0%`,
              }}
            >
              <TicketQueueSidebar
                roomData={roomData}
                canManageQueue={
                  isModeratorView ||
                  roomData?.settings.allowOthersToManageQueue === true
                }
                onViewQueue={() => setIsQueueModalOpen(true)}
                onOpenQueueSettings={onOpenQueueSettings}
                onUpdateTicket={handleUpdateTicket}
                onSelectTicket={handleSelectTicket}
                className="mt-auto"
                isCollapsed={isQueueCollapsed}
                onToggleCollapse={() => setIsQueueCollapsed((prev) => !prev)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
