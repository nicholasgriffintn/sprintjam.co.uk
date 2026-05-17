import { useEffect, useMemo, useRef, useState } from "react";
import type {
  RetroCard,
  RetroData,
  RetroPhase,
  WorkspaceActionPriority,
} from "@sprintjam/types";

import { useRetroHeader } from "@/context/RetroHeaderContext";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { getStoredUserName } from "@/hooks/useUserPersistence";
import {
  addRetroAction,
  completeRetro,
  connectRetroWebSocket,
  deleteRetroCard,
  disconnectRetroWebSocket,
  groupRetroCards,
  moveRetroCard,
  sendRetroCard,
  setRetroPhase,
  setRetroReady,
  toggleRetroAction,
  ungroupRetroCard,
  updateRetroAction,
  updateRetroCard,
  voteRetroCard,
} from "@/lib/retro-api-service";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ShareSessionModal } from "@/components/share/ShareSessionModal";
import { RetroActionsPanel } from "@/components/retro/RetroActionsPanel";
import { RetroBoard } from "@/components/retro/RetroBoard";
import { RetroParticipantsPanel } from "@/components/retro/RetroParticipantsPanel";
import { RetroRecapPanel } from "@/components/retro/RetroRecapPanel";
import { RetroTimerChip } from "@/components/retro/RetroTimerChip";
import { useRetroWorkspaceCompletion } from "@/components/retro/useRetroWorkspaceCompletion";
import {
  getUserVoteCount,
  type RetroCardSortMode,
  type RetroCardVoteFilter,
} from "@/components/retro/retro-board-utils";
import { downloadCsv } from "@/utils/csv";
import { parseDateInputValue } from "@/utils/date";
import { downloadTextFile } from "@/utils/download";
import { buildRetroRecapCsv, buildRetroRecapText } from "@/utils/retro-recap";

interface RetroRoomScreenProps {
  retroKey: string;
}

const phaseOrder: RetroPhase[] = ["input", "review", "focus", "completed"];

const phaseLabels: Record<RetroPhase, string> = {
  input: "Input",
  review: "Review",
  focus: "Focus",
  completed: "Completed",
};

export function RetroRoomScreen({ retroKey }: RetroRoomScreenProps) {
  const userName = useMemo(() => getStoredUserName(), []);
  const { isAuthenticated } = useWorkspaceData();
  const {
    setRetroKey,
    setPhase: setHeaderPhase,
    setStatus: setHeaderStatus,
    setParticipantCount,
    isShareModalOpen,
    setIsShareModalOpen,
  } = useRetroHeader();
  const [retro, setRetro] = useState<RetroData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completionNotice, setCompletionNotice] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [cardSort, setCardSort] = useState<RetroCardSortMode>("newest");
  const [cardFilter, setCardFilter] = useState<RetroCardVoteFilter>("all");
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState("");
  const [editingCard, setEditingCard] = useState<{
    id: string;
    text: string;
  } | null>(null);
  const [voteNotice, setVoteNotice] = useState<string | null>(null);
  const [actionTitle, setActionTitle] = useState("");
  const [actionOwner, setActionOwner] = useState("");
  const [actionDueDate, setActionDueDate] = useState("");
  const [actionPriority, setActionPriority] =
    useState<WorkspaceActionPriority>("normal");
  const completedWorkspaceSyncRef = useRef<string | null>(null);
  const completeWorkspaceHistory = useRetroWorkspaceCompletion({
    retroData: retro,
    retroKey,
    isAuthenticated,
  });

  useEffect(() => {
    setRetroKey(retro?.key ?? retroKey);
    setHeaderPhase(retro?.phase ?? null);
    setHeaderStatus(retro?.status ?? null);
    setParticipantCount(retro?.users.length ?? 0);
    return () => {
      setRetroKey(null);
      setHeaderPhase(null);
      setHeaderStatus(null);
      setParticipantCount(0);
      setIsShareModalOpen(false);
    };
  }, [
    retro,
    retroKey,
    setHeaderPhase,
    setHeaderStatus,
    setIsShareModalOpen,
    setParticipantCount,
    setRetroKey,
  ]);

  useEffect(() => {
    if (!userName) {
      setError("Join this retro before opening the room.");
      return;
    }

    const socket = connectRetroWebSocket(retroKey, userName, (message) => {
      if (message.type === "initialize") {
        setRetro(message.retro);
        setError(null);
      }
      if (message.type === "retroUpdated") {
        setRetro(message.retro);
        setVoteNotice(null);
      }
      if (message.type === "userJoined") {
        setRetro((current) =>
          current
            ? {
                ...current,
                users: message.users,
                connectedUsers: {
                  ...current.connectedUsers,
                  [message.user]: true,
                },
                userAvatars: message.userAvatars ?? current.userAvatars,
              }
            : current,
        );
      }
      if (message.type === "userLeft") {
        setRetro((current) =>
          current
            ? {
                ...current,
                users: message.users,
                connectedUsers: {
                  ...current.connectedUsers,
                  [message.user]: false,
                },
              }
            : current,
        );
      }
      if (message.type === "error") {
        setError(message.error);
      }
    });

    return () => {
      socket.close();
      disconnectRetroWebSocket();
    };
  }, [retroKey, userName]);

  useEffect(() => {
    if (
      retro?.status !== "completed" ||
      completedWorkspaceSyncRef.current === retro.key
    ) {
      return;
    }

    completedWorkspaceSyncRef.current = retro.key;
    completeWorkspaceHistory().then((warning) => {
      if (warning) {
        setCompletionNotice(warning);
      }
    });
  }, [completeWorkspaceHistory, retro?.key, retro?.status]);

  useEffect(() => {
    if (selectedCardIds.length === 0 && groupTitle) {
      setGroupTitle("");
    }
  }, [groupTitle, selectedCardIds.length]);

  if (error && !retro) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4">
        <Alert variant="warning">{error}</Alert>
      </div>
    );
  }

  if (!retro) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-sm font-semibold text-slate-500 dark:text-slate-300">
        Loading retro…
      </div>
    );
  }

  const isModerator = retro.moderator === userName;
  const currentPhaseIndex = phaseOrder.indexOf(retro.phase);
  const nextPhase =
    phaseOrder[Math.min(currentPhaseIndex + 1, phaseOrder.length - 1)];
  const isReady = retro.readyUsers.includes(userName);
  const canMovePhase =
    isModerator || retro.settings.allowParticipantPhaseControl;
  const canUseNextPhase =
    nextPhase === "completed" ? isModerator : canMovePhase;
  const showActionsPanel =
    retro.phase === "focus" || retro.actionItems.length > 0;
  const userVoteCount = getUserVoteCount(retro.cards, userName);
  const remainingVotes = Math.max(
    retro.settings.votesPerParticipant - userVoteCount,
    0,
  );
  const participantOptions = retro.users.map((user) => ({
    value: user,
    label: user,
  }));

  const addCard = (columnId: string) => {
    const text = drafts[columnId]?.trim();
    if (!text) return;
    sendRetroCard(columnId, text);
    setDrafts((current) => ({ ...current, [columnId]: "" }));
  };

  const updateCardDraft = (columnId: string, value: string) => {
    setDrafts((current) => ({
      ...current,
      [columnId]: value,
    }));
  };

  const addAction = () => {
    const title = actionTitle.trim();
    if (!title) return;
    addRetroAction(title, {
      owner: actionOwner || undefined,
      dueAt: parseDateInputValue(actionDueDate),
      priority: actionPriority,
    });
    setActionTitle("");
    setActionOwner("");
    setActionDueDate("");
    setActionPriority("normal");
  };

  const handleVoteCard = (card: RetroCard) => {
    const hasVote = card.votes.includes(userName);
    if (!hasVote && remainingVotes <= 0) {
      setVoteNotice(
        `Vote limit reached. Remove a vote before adding another (${userVoteCount}/${retro.settings.votesPerParticipant}).`,
      );
      return;
    }

    voteRetroCard(card.id);
  };

  const toggleCardSelection = (cardId: string) => {
    const card = retro.cards.find((item) => item.id === cardId);
    if (!card) {
      return;
    }

    setSelectedCardIds((current) => {
      if (current.includes(cardId)) {
        return current.filter((id) => id !== cardId);
      }

      const sameColumnSelection = current.filter((id) =>
        retro.cards.some(
          (item) => item.id === id && item.columnId === card.columnId,
        ),
      );

      return [...sameColumnSelection, cardId];
    });
  };

  const saveCardEdit = () => {
    const text = editingCard?.text.trim();
    if (!editingCard || !text) {
      return;
    }

    updateRetroCard(editingCard.id, text);
    setEditingCard(null);
  };

  const updateEditingCardDraft = (cardId: string, text: string) => {
    setEditingCard({ id: cardId, text });
  };

  const groupSelectedCards = () => {
    const title = groupTitle.trim();
    if (selectedCardIds.length < 2 || !title) {
      return;
    }

    groupRetroCards(selectedCardIds, title);
    setSelectedCardIds([]);
    setGroupTitle("");
  };

  const updateActionOwner = (actionId: string, owner: string) => {
    updateRetroAction(actionId, { owner: owner || null });
  };

  const updateActionDueDate = (actionId: string, value: string) => {
    updateRetroAction(actionId, { dueAt: parseDateInputValue(value) });
  };

  const updateActionPriority = (
    actionId: string,
    priority: WorkspaceActionPriority,
  ) => {
    updateRetroAction(actionId, { priority });
  };

  const exportRetroText = () => {
    downloadTextFile(
      `retro-${retro.key}-recap.txt`,
      buildRetroRecapText(retro),
    );
  };

  const exportRetroCsv = () => {
    downloadCsv(`retro-${retro.key}-recap.csv`, buildRetroRecapCsv(retro));
  };

  const handleNextPhase = () => {
    if (nextPhase === "completed") {
      if (!isModerator) {
        return;
      }
      setCompletionNotice(null);
      completedWorkspaceSyncRef.current = retro.key;
      completeRetro();
      completeWorkspaceHistory({ forceCompleteSession: true }).then(
        setCompletionNotice,
      );
      return;
    }

    setRetroPhase(nextPhase);
  };

  return (
    <div
      data-testid="retro-room"
      className="flex h-[calc(100vh-4.5rem)] min-h-0 overflow-hidden bg-[radial-gradient(circle_at_1px_1px,rgba(100,116,139,0.26)_1px,transparent_0)] [background-size:28px_28px] px-4 py-6 sm:px-6"
    >
      <ShareSessionModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Share Retro"
        sessionType="retro"
        sessionKey={retroKey}
        inputId="share-retro-url"
        inputAriaLabel="Shareable retro URL"
        copySuccessMessage="Retro link copied"
        copyErrorMessage="Couldn't copy retro link"
        qrCodeTitle="QR code for retro invite link"
        footer="Anyone with this link can join this retro."
      />
      <div className="mx-auto flex min-h-0 w-full max-w-[108rem] flex-1 flex-col gap-5">
        {error ? <Alert variant="warning">{error}</Alert> : null}
        {voteNotice ? <Alert variant="warning">{voteNotice}</Alert> : null}
        {completionNotice ? (
          <Alert variant="warning">{completionNotice}</Alert>
        ) : null}

        <section className="grid min-h-0 flex-1 items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="h-full min-h-0">
            <RetroBoard
              retro={retro}
              userName={userName}
              isModerator={isModerator}
              drafts={drafts}
              cardSort={cardSort}
              cardFilter={cardFilter}
              selectedCardIds={selectedCardIds}
              groupTitle={groupTitle}
              editingCard={editingCard}
              boardControls={
                <>
                  <Badge variant={remainingVotes > 0 ? "primary" : "warning"}>
                    {remainingVotes} of {retro.settings.votesPerParticipant}{" "}
                    votes left
                  </Badge>
                  <RetroTimerChip retro={retro} isModerator={isModerator} />
                  {phaseOrder.map((phase) => (
                    <Button
                      key={phase}
                      type="button"
                      size="sm"
                      variant={retro.phase === phase ? "primary" : "secondary"}
                      disabled={
                        phase === "completed" ||
                        (!isModerator &&
                          !retro.settings.allowParticipantPhaseControl)
                      }
                      onClick={() => setRetroPhase(phase)}
                    >
                      {phaseLabels[phase]}
                    </Button>
                  ))}
                  {retro.phase !== "completed" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => handleNextPhase()}
                      disabled={!canUseNextPhase}
                    >
                      Next
                    </Button>
                  ) : null}
                </>
              }
              onCardSortChange={setCardSort}
              onCardFilterChange={setCardFilter}
              onGroupTitleChange={setGroupTitle}
              onGroupSelectedCards={groupSelectedCards}
              onDraftChange={updateCardDraft}
              onAddCard={addCard}
              onToggleCardSelection={toggleCardSelection}
              onEditCardDraftChange={updateEditingCardDraft}
              onSaveCardEdit={saveCardEdit}
              onCancelCardEdit={() => setEditingCard(null)}
              onVoteCard={handleVoteCard}
              onMoveCard={moveRetroCard}
              onStartCardEdit={(card) =>
                setEditingCard({ id: card.id, text: card.text })
              }
              onUngroupCard={ungroupRetroCard}
              onDeleteCard={deleteRetroCard}
            />
          </div>

          <aside className="space-y-4">
            <RetroParticipantsPanel
              users={retro.users}
              readyUsers={retro.readyUsers}
              isReady={isReady}
              onReadyChange={setRetroReady}
            />
            {retro.status === "completed" ? (
              <RetroRecapPanel
                retro={retro}
                onExportText={exportRetroText}
                onExportCsv={exportRetroCsv}
              />
            ) : null}

            {showActionsPanel ? (
              <RetroActionsPanel
                phase={retro.phase}
                actionItems={retro.actionItems}
                participantOptions={participantOptions}
                actionTitle={actionTitle}
                actionOwner={actionOwner}
                actionDueDate={actionDueDate}
                actionPriority={actionPriority}
                onActionTitleChange={setActionTitle}
                onActionOwnerChange={setActionOwner}
                onActionDueDateChange={setActionDueDate}
                onActionPriorityChange={setActionPriority}
                onAddAction={addAction}
                onToggleAction={toggleRetroAction}
                onUpdateActionOwner={updateActionOwner}
                onUpdateActionDueDate={updateActionDueDate}
                onUpdateActionPriority={updateActionPriority}
              />
            ) : null}
          </aside>
        </section>
      </div>
    </div>
  );
}
