import { AnimatePresence, motion } from "framer-motion";
import { Gamepad2, Maximize2, Sparkles, X } from "lucide-react";

import { RoomGamePanel } from "@/components/games/RoomGamePanel";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import type { RoomData } from "@/types";

interface RoomGameOverlayProps {
  roomData: RoomData;
  userName: string;
  gameTitle: string;
  gameAnnouncement: string | null;
  isGamePanelMinimised: boolean;
  onDismissAnnouncement: () => void;
  onExpandPanel: () => void;
  onMinimisePanel: () => void;
  onSubmitGameMove: (value: string) => void;
  onEndGame: () => void;
}

export const RoomGameOverlay = ({
  roomData,
  userName,
  gameTitle,
  gameAnnouncement,
  isGamePanelMinimised,
  onDismissAnnouncement,
  onExpandPanel,
  onMinimisePanel,
  onSubmitGameMove,
  onEndGame,
}: RoomGameOverlayProps) => (
  <>
    <AnimatePresence>
      {gameAnnouncement ? (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="fixed left-4 right-4 top-20 z-40 sm:left-auto sm:max-w-md"
        >
          <SurfaceCard
            padding="sm"
            variant="subtle"
            className="relative overflow-hidden border-brand-300/60 bg-brand-50/90 text-sm text-brand-900 shadow-lg dark:border-brand-300/30 dark:bg-brand-400/15 dark:text-brand-100"
          >
            <div className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-cyan-300/35 blur-2xl dark:bg-cyan-300/15" />
            <div className="relative flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-100" />
              <p className="flex-1">{gameAnnouncement}</p>
              <button
                type="button"
                onClick={onDismissAnnouncement}
                className="rounded-md p-1 text-brand-700 transition hover:bg-brand-100 hover:text-brand-900 dark:text-brand-100 dark:hover:bg-brand-300/20"
                aria-label="Close game notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </SurfaceCard>
        </motion.div>
      ) : null}
    </AnimatePresence>

    {roomData.gameSession ? (
      <div className="pointer-events-none fixed bottom-4 left-4 z-30 w-[calc(100vw-2rem)] sm:w-[min(520px,calc(100vw-2rem))]">
        <div className="pointer-events-auto">
          {isGamePanelMinimised ? (
            <button
              type="button"
              onClick={onExpandPanel}
              className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-brand-300/70 bg-white/95 px-4 py-3 text-left text-slate-900 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-brand-400/30 dark:bg-slate-900/95 dark:text-white"
              aria-label="Expand party game panel"
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 transition group-hover:rotate-3 motion-reduce:transition-none dark:bg-brand-400/20 dark:text-brand-200">
                  <Gamepad2 className="h-4 w-4" />
                </span>
                {gameTitle}
              </span>
              <span className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                {roomData.gameSession.status === "active"
                  ? `Round ${roomData.gameSession.round}`
                  : "Game over"}
                <Maximize2 className="h-4 w-4" />
              </span>
            </button>
          ) : (
            <RoomGamePanel
              roomData={roomData}
              userName={userName}
              onSubmitMove={onSubmitGameMove}
              onEndGame={onEndGame}
              onMinimise={onMinimisePanel}
            />
          )}
        </div>
      </div>
    ) : null}
  </>
);
