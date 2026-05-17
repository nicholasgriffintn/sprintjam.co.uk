import {
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { RetroCard, RetroData } from "@sprintjam/types";
import { Edit3, GripVertical, Plus, Save, ThumbsUp } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  getRetroBoardDropTargetKey,
  resolveRetroBoardDrop,
  type RetroBoardDragPayload,
  type RetroBoardDropAction,
  type RetroBoardDropTarget,
} from "@/components/retro/retro-board-dnd";
import {
  filterAndSortRetroCards,
  type RetroCardSortMode,
  type RetroCardVoteFilter,
} from "@/components/retro/retro-board-utils";
import { useRetroBoardDrag } from "@/components/retro/useRetroBoardDrag";
import { cn } from "@/lib/cn";

interface RetroBoardProps {
  retro: RetroData;
  userName: string;
  isModerator: boolean;
  drafts: Record<string, string>;
  cardSort: RetroCardSortMode;
  cardFilter: RetroCardVoteFilter;
  editingCard: { id: string; text: string } | null;
  boardControls?: ReactNode;
  onCardSortChange: (sort: RetroCardSortMode) => void;
  onCardFilterChange: (filter: RetroCardVoteFilter) => void;
  onDraftChange: (columnId: string, value: string) => void;
  onAddCard: (columnId: string) => void;
  onEditCardDraftChange: (cardId: string, text: string) => void;
  onSaveCardEdit: () => void;
  onCancelCardEdit: () => void;
  onVoteCard: (card: RetroCard) => void;
  onMoveCard: (cardId: string, columnId: string) => void;
  onGroupCards: (cardIds: string[], title: string) => void;
  onStartCardEdit: (card: RetroCard) => void;
  onUngroupCard: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void;
}

const cardSortOptions: Array<{ value: RetroCardSortMode; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "most-votes", label: "Most votes" },
  { value: "fewest-votes", label: "Fewest votes" },
];

const cardFilterOptions: Array<{ value: RetroCardVoteFilter; label: string }> =
  [
    { value: "all", label: "All cards" },
    { value: "voted", label: "With votes" },
    { value: "unvoted", label: "No votes" },
  ];

const columnToneClasses = {
  emerald:
    "border-emerald-300/70 bg-emerald-50/80 text-emerald-700 dark:border-emerald-300/30 dark:bg-emerald-400/10 dark:text-emerald-100",
  rose: "border-rose-300/70 bg-rose-50/80 text-rose-700 dark:border-rose-300/30 dark:bg-rose-400/10 dark:text-rose-100",
  sky: "border-sky-300/70 bg-sky-50/80 text-sky-700 dark:border-sky-300/30 dark:bg-sky-400/10 dark:text-sky-100",
  amber:
    "border-amber-300/70 bg-amber-50/80 text-amber-700 dark:border-amber-300/30 dark:bg-amber-400/10 dark:text-amber-100",
  violet:
    "border-violet-300/70 bg-violet-50/80 text-violet-700 dark:border-violet-300/30 dark:bg-violet-400/10 dark:text-violet-100",
  slate:
    "border-slate-300/70 bg-slate-50/80 text-slate-700 dark:border-white/15 dark:bg-white/10 dark:text-white",
} as const;

type CardListItem =
  | { type: "card"; card: RetroCard }
  | { type: "group"; groupId: string; groupTitle: string; cards: RetroCard[] };

function buildCardListItems(cards: RetroCard[]): CardListItem[] {
  const seenGroupIds = new Set<string>();

  return cards.flatMap((card): CardListItem[] => {
    if (!card.groupId || !card.groupTitle) {
      return [{ type: "card", card }];
    }

    if (seenGroupIds.has(card.groupId)) {
      return [];
    }

    seenGroupIds.add(card.groupId);
    return [
      {
        type: "group",
        groupId: card.groupId,
        groupTitle: card.groupTitle,
        cards: cards.filter((item) => item.groupId === card.groupId),
      },
    ];
  });
}

export function RetroBoard({
  retro,
  userName,
  isModerator,
  drafts,
  cardSort,
  cardFilter,
  editingCard,
  boardControls,
  onCardSortChange,
  onCardFilterChange,
  onDraftChange,
  onAddCard,
  onEditCardDraftChange,
  onSaveCardEdit,
  onCancelCardEdit,
  onVoteCard,
  onMoveCard,
  onGroupCards,
  onStartCardEdit,
  onUngroupCard,
  onDeleteCard,
}: RetroBoardProps) {
  const [keyboardDragPayload, setKeyboardDragPayload] =
    useState<RetroBoardDragPayload | null>(null);

  const applyDropAction = (action: RetroBoardDropAction) => {
    if (action.type === "none") {
      return;
    }

    if (action.type === "moveCards") {
      action.ungroupCardIds?.forEach((cardId) => onUngroupCard(cardId));
      action.cardIds.forEach((cardId) => onMoveCard(cardId, action.columnId));
      return;
    }

    action.ungroupCardIds?.forEach((cardId) => onUngroupCard(cardId));
    action.cardIds.forEach((cardId) => {
      const card = retro.cards.find((item) => item.id === cardId);
      if (card && card.columnId !== action.columnId) {
        onMoveCard(cardId, action.columnId);
      }
    });
    onGroupCards(action.cardIds, action.title);
  };

  const applyDropTarget = (
    target: RetroBoardDropTarget,
    payload: RetroBoardDragPayload | null,
  ) => {
    applyDropAction(
      resolveRetroBoardDrop({
        cards: retro.cards,
        payload,
        target,
      }),
    );
  };

  const { activeDragPayload, activeDropTargetKey, startPointerDrag } =
    useRetroBoardDrag({
      isEnabled: isModerator,
      onDrop: applyDropTarget,
    });

  const handleKeyboardDrop = (
    event: KeyboardEvent<HTMLElement>,
    target: RetroBoardDropTarget,
  ) => {
    if (
      !isModerator ||
      isFromInteractiveElement(event) ||
      !isKeyboardDropKey(event)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (keyboardDragPayload) {
      applyDropTarget(target, keyboardDragPayload);
      setKeyboardDragPayload(null);
    }
  };

  const handleGroupKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    groupId: string,
  ) => {
    if (!isModerator || isFromInteractiveElement(event)) {
      return;
    }

    if (event.key === "Escape") {
      setKeyboardDragPayload(null);
      return;
    }

    if (!isKeyboardDropKey(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const groupDropTarget: RetroBoardDropTarget = { type: "group", groupId };
    if (keyboardDragPayload) {
      applyDropTarget(groupDropTarget, keyboardDragPayload);
      setKeyboardDragPayload(null);
      return;
    }

    setKeyboardDragPayload({ type: "group", groupId });
  };

  const handleCardKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    cardId: string,
  ) => {
    if (!isModerator || isFromInteractiveElement(event)) {
      return;
    }

    if (event.key === "Escape") {
      setKeyboardDragPayload(null);
      return;
    }

    if (!isKeyboardDropKey(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (keyboardDragPayload) {
      applyDropTarget({ type: "card", cardId }, keyboardDragPayload);
      setKeyboardDragPayload(null);
      return;
    }

    setKeyboardDragPayload({ type: "card", cardId });
  };

  return (
    <div className="flex flex-col gap-4 xl:h-full xl:min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {boardControls}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Select
            aria-label="Sort retro cards"
            value={cardSort}
            options={cardSortOptions}
            onValueChange={(value) =>
              onCardSortChange(value as RetroCardSortMode)
            }
            className="w-40 rounded-xl px-3 py-2 text-sm"
          />
          <Select
            aria-label="Filter retro cards"
            value={cardFilter}
            options={cardFilterOptions}
            onValueChange={(value) =>
              onCardFilterChange(value as RetroCardVoteFilter)
            }
            className="w-40 rounded-xl px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mx-auto w-full pb-2 xl:min-h-0 xl:flex-1 xl:overflow-x-auto">
        <div
          className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:h-full xl:min-h-0 xl:min-w-full xl:[grid-template-columns:repeat(var(--retro-column-count),minmax(260px,1fr))]"
          style={
            {
              "--retro-column-count": retro.template.columns.length,
            } as CSSProperties
          }
        >
          {retro.template.columns.map((column) => {
            const cards = filterAndSortRetroCards({
              columnId: column.id,
              cards: retro.cards,
              filter: cardFilter,
              sort: cardSort,
            });
            const cardListItems = buildCardListItems(cards);
            const columnDropTarget: RetroBoardDropTarget = {
              type: "column",
              columnId: column.id,
            };

            return (
              <div
                key={column.id}
                data-testid="retro-column"
                data-retro-column-id={column.id}
                className={cn(
                  "flex min-h-[22rem] flex-col rounded-2xl border border-dashed p-4 md:min-h-[24rem] xl:h-full xl:min-h-0",
                  columnToneClasses[column.tone],
                )}
              >
                <div className="border-b border-current/15 pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xl font-black">{column.title}</h2>
                    <span className="rounded-full bg-white/70 px-2 py-1 text-xs font-bold dark:bg-black/20">
                      {cards.length}
                    </span>
                  </div>
                  <p className="text-sm opacity-80">{column.prompt}</p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4 pr-1">
                  <div
                    data-testid="retro-column-drop-zone"
                    data-retro-column-id={column.id}
                    tabIndex={isModerator ? 0 : undefined}
                    onKeyDown={(event) =>
                      handleKeyboardDrop(event, columnDropTarget)
                    }
                    className={cn(
                      "flex min-h-32 flex-col gap-3 rounded-xl outline-none transition",
                      activeDropTargetKey ===
                        getRetroBoardDropTargetKey(columnDropTarget) &&
                        "bg-white/50 ring-2 ring-brand-300/60 dark:bg-white/10",
                    )}
                  >
                    {isModerator ? (
                      <div
                        data-testid="retro-column-move-zone"
                        data-retro-column-id={column.id}
                        className={cn(
                          "h-2 rounded-lg border border-transparent transition-all",
                          activeDragPayload &&
                            "h-8 border-current/20 bg-white/45 dark:bg-white/10",
                          activeDropTargetKey ===
                            getRetroBoardDropTargetKey(columnDropTarget) &&
                            "border-brand-300 bg-brand-50/80 ring-2 ring-brand-300/60 dark:border-brand-300/60 dark:bg-brand-500/15",
                        )}
                      />
                    ) : null}
                    {cardListItems.map((item) => {
                      if (item.type === "group") {
                        const groupDropTarget: RetroBoardDropTarget = {
                          type: "group",
                          groupId: item.groupId,
                        };

                        return (
                          <section
                            key={item.groupId}
                            data-testid="retro-card-group"
                            data-retro-group-id={item.groupId}
                            tabIndex={isModerator ? 0 : undefined}
                            onKeyDown={(event) =>
                              handleGroupKeyDown(event, item.groupId)
                            }
                            className={cn(
                              "rounded-2xl border border-slate-300/80 bg-white/70 p-2 shadow-sm outline-none transition dark:border-white/15 dark:bg-white/5",
                              activeDropTargetKey ===
                                getRetroBoardDropTargetKey(groupDropTarget) &&
                                "ring-2 ring-brand-300/60",
                            )}
                          >
                            <div
                              onPointerDown={(event) =>
                                startPointerDrag(event, {
                                  type: "group",
                                  groupId: item.groupId,
                                })
                              }
                              className={cn(
                                "mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 dark:border-white/10 dark:bg-white/10 dark:text-white",
                                isModerator &&
                                  "cursor-grab active:cursor-grabbing",
                              )}
                            >
                              <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.18em] text-slate-700 dark:text-white">
                                {isModerator ? (
                                  <GripVertical className="h-3.5 w-3.5" />
                                ) : null}
                                Group: {item.groupTitle}
                              </span>
                              <Badge variant="info">
                                {item.cards.length} cards
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              {item.cards.map((card) =>
                                renderCard({
                                  card,
                                  userName,
                                  isModerator,
                                  editingCard,
                                  activeDragPayload,
                                  activeDropTargetKey,
                                  keyboardDragPayload,
                                  onCardPointerDragStart: startPointerDrag,
                                  onCardKeyDown: handleCardKeyDown,
                                  onEditCardDraftChange,
                                  onSaveCardEdit,
                                  onCancelCardEdit,
                                  onVoteCard,
                                  onStartCardEdit,
                                  onUngroupCard,
                                  onDeleteCard,
                                }),
                              )}
                            </div>
                          </section>
                        );
                      }

                      return renderCard({
                        card: item.card,
                        userName,
                        isModerator,
                        editingCard,
                        activeDragPayload,
                        activeDropTargetKey,
                        keyboardDragPayload,
                        onCardPointerDragStart: startPointerDrag,
                        onCardKeyDown: handleCardKeyDown,
                        onEditCardDraftChange,
                        onSaveCardEdit,
                        onCancelCardEdit,
                        onVoteCard,
                        onStartCardEdit,
                        onUngroupCard,
                        onDeleteCard,
                      });
                    })}
                  </div>
                </div>

                {retro.phase === "input" ? (
                  <div className="mt-auto space-y-2 border-t border-current/15 pt-3">
                    <textarea
                      value={drafts[column.id] ?? ""}
                      onChange={(event) =>
                        onDraftChange(column.id, event.target.value)
                      }
                      placeholder={`Add a card for ${column.title.toLowerCase()}`}
                      className="min-h-24 w-full rounded-xl border border-white/70 bg-white/90 p-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-brand-200 dark:border-white/10 dark:bg-slate-950/70 dark:text-white dark:placeholder:text-slate-500"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      fullWidth
                      icon={<Plus className="h-4 w-4" />}
                      onClick={() => onAddCard(column.id)}
                    >
                      Add card
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function renderCard({
  card,
  userName,
  isModerator,
  editingCard,
  activeDragPayload,
  activeDropTargetKey,
  keyboardDragPayload,
  onCardPointerDragStart,
  onCardKeyDown,
  onEditCardDraftChange,
  onSaveCardEdit,
  onCancelCardEdit,
  onVoteCard,
  onStartCardEdit,
  onUngroupCard,
  onDeleteCard,
}: {
  card: RetroCard;
  userName: string;
  isModerator: boolean;
  editingCard: { id: string; text: string } | null;
  activeDragPayload: RetroBoardDragPayload | null;
  activeDropTargetKey: string | null;
  keyboardDragPayload: RetroBoardDragPayload | null;
  onCardPointerDragStart: (
    event: PointerEvent<HTMLElement>,
    payload: RetroBoardDragPayload,
  ) => void;
  onCardKeyDown: (event: KeyboardEvent<HTMLElement>, cardId: string) => void;
  onEditCardDraftChange: (cardId: string, text: string) => void;
  onSaveCardEdit: () => void;
  onCancelCardEdit: () => void;
  onVoteCard: (card: RetroCard) => void;
  onStartCardEdit: (card: RetroCard) => void;
  onUngroupCard: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void;
}) {
  const cardDropTarget: RetroBoardDropTarget = {
    type: "card",
    cardId: card.id,
  };
  const isKeyboardDragging =
    keyboardDragPayload?.type === "card" &&
    keyboardDragPayload.cardId === card.id;
  const isPointerDragging =
    activeDragPayload?.type === "card" && activeDragPayload.cardId === card.id;
  const canDragCard = isModerator && editingCard?.id !== card.id;

  return (
    <article
      key={card.id}
      data-testid="retro-card"
      data-retro-card-id={card.id}
      tabIndex={isModerator ? 0 : undefined}
      aria-label={`Retro card: ${card.text}`}
      onKeyDown={(event) => onCardKeyDown(event, card.id)}
      className={cn(
        "rounded-xl border border-white/70 bg-white/90 p-3 text-slate-800 shadow-sm outline-none transition dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100",
        isPointerDragging && "opacity-60",
        (activeDropTargetKey === getRetroBoardDropTargetKey(cardDropTarget) ||
          isKeyboardDragging) &&
          "border-brand-300 bg-brand-50/80 ring-2 ring-brand-300/50 dark:border-brand-300/60 dark:bg-brand-500/15",
      )}
    >
      {canDragCard ? (
        <button
          type="button"
          aria-label={`Drag ${card.text}`}
          onPointerDown={(event) =>
            onCardPointerDragStart(event, { type: "card", cardId: card.id })
          }
          className={cn(
            "mb-2 inline-flex rounded-md text-slate-400 outline-none hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-brand-300 dark:text-slate-500 dark:hover:text-slate-300",
            canDragCard && "cursor-grab active:cursor-grabbing",
          )}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : null}
      {editingCard?.id === card.id ? (
        <div className="space-y-2">
          <textarea
            value={editingCard.text}
            onChange={(event) =>
              onEditCardDraftChange(card.id, event.target.value)
            }
            className="min-h-24 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-brand-200 dark:border-white/10 dark:bg-slate-900 dark:text-white"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              icon={<Save className="h-4 w-4" />}
              onClick={onSaveCardEdit}
            >
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onCancelCardEdit}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm">{card.text}</p>
      )}
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>{card.author || "Anonymous"}</span>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            data-testid="retro-card-vote"
            aria-label={`Vote for ${card.text}`}
            onClick={() => onVoteCard(card)}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 font-semibold dark:bg-white/10"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            {card.votes.length}
          </button>
          {(card.owner ?? card.author) === userName || isModerator ? (
            <button
              type="button"
              onClick={() => onStartCardEdit(card)}
              className="inline-flex items-center gap-1 font-semibold text-brand-700 dark:text-brand-200"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit
            </button>
          ) : null}
          {isModerator && card.groupId ? (
            <button
              type="button"
              onClick={() => onUngroupCard(card.id)}
              className="font-semibold text-slate-600 dark:text-slate-300"
            >
              Ungroup
            </button>
          ) : null}
          {(card.owner ?? card.author) === userName || isModerator ? (
            <button
              type="button"
              onClick={() => onDeleteCard(card.id)}
              className="font-semibold text-rose-600 dark:text-rose-300"
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function isKeyboardDropKey(event: KeyboardEvent<HTMLElement>): boolean {
  return event.key === "Enter" || event.key === " ";
}

function isFromInteractiveElement(event: KeyboardEvent<HTMLElement>): boolean {
  return (
    event.target instanceof HTMLElement &&
    Boolean(
      event.target.closest(
        "a,button,input,select,textarea,[contenteditable='true']",
      ),
    )
  );
}
