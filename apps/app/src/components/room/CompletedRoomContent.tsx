import { Footer } from "@/components/layout/Footer";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { RoomStatsPanel } from "@/components/room/RoomStatsPanel";
import { CompletedWorkspaceFollowUps } from "@/components/room/CompletedWorkspaceFollowUps";
import type { RoomData } from "@/types";
import type { TeamSession } from "@sprintjam/types";
import { useRoomSessionRecap } from "@/hooks/useRoomSessionRecap";
import { formatRoomGameTitle } from "@/utils/room-game";

interface CompletedRoomContentProps {
  roomData: RoomData;
  isQueueEnabled: boolean;
  linkedWorkspaceSession: TeamSession | null;
  linkedWorkspaceTeamName: string | null;
  onWorkspaceSessionSaved: (session: TeamSession) => void;
  onOpenRenameWorkspaceSession: () => void;
  onOpenGames: () => void;
}

export const CompletedRoomContent = ({
  roomData,
  isQueueEnabled,
  linkedWorkspaceSession,
  linkedWorkspaceTeamName,
  onWorkspaceSessionSaved,
  onOpenRenameWorkspaceSession,
  onOpenGames,
}: CompletedRoomContentProps) => {
  const recap = useRoomSessionRecap(roomData, isQueueEnabled);
  const gameTitle = roomData.gameSession
    ? formatRoomGameTitle(roomData.gameSession.type)
    : "";

  return (
    <>
      <SurfaceCard padding="md" className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Session summary
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          This room is now read-only.
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Review the notes and votes captured for each{" "}
          {isQueueEnabled ? "ticket" : "round"}.
        </p>
        <CompletedWorkspaceFollowUps
          roomKey={roomData.key}
          suggestedName={roomData.currentTicket?.title ?? "Sprint planning"}
          linkedWorkspaceSession={linkedWorkspaceSession}
          linkedWorkspaceTeamName={linkedWorkspaceTeamName}
          onWorkspaceSessionSaved={onWorkspaceSessionSaved}
          onOpenRenameWorkspaceSession={onOpenRenameWorkspaceSession}
        />
      </SurfaceCard>

      <SurfaceCard
        padding="md"
        variant="subtle"
        className="grid gap-4 text-sm text-slate-600 dark:text-slate-300 md:grid-cols-3"
      >
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Participants
          </div>
          <div className="text-lg font-semibold text-slate-900 dark:text-white">
            {roomData.users.length || recap.votersCount}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {recap.estimatedItemLabel}
          </div>
          <div className="text-lg font-semibold text-slate-900 dark:text-white">
            {recap.estimatedItemCount}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Votes recorded
          </div>
          <div className="text-lg font-semibold text-slate-900 dark:text-white">
            {recap.votesCount}
          </div>
        </div>
      </SurfaceCard>

      {roomData.gameSession?.status === "completed" ? (
        <SurfaceCard padding="md" className="space-y-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Game recap
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Game
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {gameTitle}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Winner
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {roomData.gameSession.winner ?? "Tie"}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Moves
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {roomData.gameSession.moves.length}
              </div>
            </div>
          </div>
          {roomData.gameSession.events.length > 0 ? (
            <div className="space-y-2">
              {roomData.gameSession.events.slice(-3).map((event) => (
                <p
                  key={event.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                  {event.message}
                </p>
              ))}
            </div>
          ) : null}
        </SurfaceCard>
      ) : null}

      <RoomStatsPanel
        roomKey={roomData.key}
        enabled={linkedWorkspaceSession !== null}
      />

      <SurfaceCard padding="md" className="space-y-3 text-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          {recap.recapTitle}
        </p>
        {recap.entries.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-300">
            {recap.emptyRecapMessage}
          </p>
        ) : (
          <div className="space-y-3">
            {recap.entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                        {entry.ticketId}
                      </span>
                      {entry.title && (
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {entry.title}
                        </span>
                      )}
                    </div>
                    {entry.outcome && (
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        Note: {entry.outcome}
                      </p>
                    )}
                  </div>
                </div>
                {entry.votes.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {entry.votes.map((vote, index) => (
                      <span
                        key={`${entry.id}-${vote.userName}-${vote.votedAt}-${index}`}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <span className="uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {vote.userName}
                        </span>
                        <span className="font-mono text-sm text-slate-900 dark:text-white">
                          {vote.structuredVotePayload?.calculatedStoryPoints ??
                            vote.vote}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    No votes recorded for this{" "}
                    {isQueueEnabled ? "ticket" : "round"}.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>

      <Footer
        displayRepoLink={false}
        layout="wide"
        fullWidth
        onOpenGames={onOpenGames}
      />
    </>
  );
};
