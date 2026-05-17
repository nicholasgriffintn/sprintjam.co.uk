import type { ReactNode } from "react";
import type { RetroCard, RetroData } from "@sprintjam/types";
import { Edit3, Layers3, Plus, Save, ThumbsUp } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  filterAndSortRetroCards,
  type RetroCardSortMode,
  type RetroCardVoteFilter,
} from "@/components/retro/retro-board-utils";
import { cn } from "@/lib/cn";

interface RetroBoardProps {
  retro: RetroData;
  userName: string;
  isModerator: boolean;
  drafts: Record<string, string>;
  cardSort: RetroCardSortMode;
  cardFilter: RetroCardVoteFilter;
  selectedCardIds: string[];
  groupTitle: string;
  editingCard: { id: string; text: string } | null;
  boardControls?: ReactNode;
  onCardSortChange: (sort: RetroCardSortMode) => void;
  onCardFilterChange: (filter: RetroCardVoteFilter) => void;
  onGroupTitleChange: (title: string) => void;
  onGroupSelectedCards: () => void;
  onDraftChange: (columnId: string, value: string) => void;
  onAddCard: (columnId: string) => void;
  onToggleCardSelection: (cardId: string) => void;
  onEditCardDraftChange: (cardId: string, text: string) => void;
  onSaveCardEdit: () => void;
  onCancelCardEdit: () => void;
  onVoteCard: (card: RetroCard) => void;
  onMoveCard: (cardId: string, columnId: string) => void;
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
  selectedCardIds,
  groupTitle,
  editingCard,
  boardControls,
  onCardSortChange,
  onCardFilterChange,
  onGroupTitleChange,
  onGroupSelectedCards,
  onDraftChange,
  onAddCard,
  onToggleCardSelection,
  onEditCardDraftChange,
  onSaveCardEdit,
  onCancelCardEdit,
  onVoteCard,
  onMoveCard,
  onStartCardEdit,
  onUngroupCard,
  onDeleteCard,
}: RetroBoardProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
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

      <div className="mx-auto min-h-0 w-full flex-1 overflow-x-auto pb-2">
        <div
          className="grid h-full min-h-0 min-w-full gap-4"
          style={{
            gridTemplateColumns: `repeat(${retro.template.columns.length}, minmax(260px, 1fr))`,
          }}
        >
          {retro.template.columns.map((column) => {
            const cards = filterAndSortRetroCards({
              columnId: column.id,
              cards: retro.cards,
              filter: cardFilter,
              sort: cardSort,
            });
            const selectedCardsInColumn = selectedCardIds.filter((cardId) =>
              retro.cards.some(
                (card) => card.id === cardId && card.columnId === column.id,
              ),
            );
            const cardListItems = buildCardListItems(cards);

            return (
              <div
                key={column.id}
                data-testid="retro-column"
                className={cn(
                  "flex h-full min-h-0 flex-col rounded-2xl border border-dashed p-4",
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

                {isModerator && selectedCardsInColumn.length > 0 ? (
                  <div className="mt-3 rounded-xl border border-current/15 bg-white/80 p-3 shadow-sm dark:bg-slate-950/50">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.14em]">
                        Group selected
                      </span>
                      <Badge variant="info">
                        {selectedCardsInColumn.length} selected
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        aria-label={`Group title for ${column.title}`}
                        value={groupTitle}
                        onChange={(event) =>
                          onGroupTitleChange(event.target.value)
                        }
                        placeholder="Group title"
                        className="min-w-0 flex-1 rounded-xl px-3 py-2 text-sm"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        icon={<Layers3 className="h-4 w-4" />}
                        disabled={
                          selectedCardsInColumn.length < 2 || !groupTitle.trim()
                        }
                        onClick={onGroupSelectedCards}
                      >
                        Group
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4 pr-1">
                  <div className="flex flex-col gap-3">
                    {cardListItems.map((item) =>
                      item.type === "group" ? (
                        <section
                          key={item.groupId}
                          data-testid="retro-card-group"
                          className="rounded-2xl border border-slate-300/80 bg-white/70 p-2 shadow-sm dark:border-white/15 dark:bg-white/5"
                        >
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 dark:border-white/10 dark:bg-white/10 dark:text-white">
                            <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-700 dark:text-white">
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
                                selectedCardIds,
                                editingCard,
                                retro,
                                onToggleCardSelection,
                                onEditCardDraftChange,
                                onSaveCardEdit,
                                onCancelCardEdit,
                                onVoteCard,
                                onMoveCard,
                                onStartCardEdit,
                                onUngroupCard,
                                onDeleteCard,
                              }),
                            )}
                          </div>
                        </section>
                      ) : (
                        renderCard({
                          card: item.card,
                          userName,
                          isModerator,
                          selectedCardIds,
                          editingCard,
                          retro,
                          onToggleCardSelection,
                          onEditCardDraftChange,
                          onSaveCardEdit,
                          onCancelCardEdit,
                          onVoteCard,
                          onMoveCard,
                          onStartCardEdit,
                          onUngroupCard,
                          onDeleteCard,
                        })
                      ),
                    )}
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
  selectedCardIds,
  editingCard,
  retro,
  onToggleCardSelection,
  onEditCardDraftChange,
  onSaveCardEdit,
  onCancelCardEdit,
  onVoteCard,
  onMoveCard,
  onStartCardEdit,
  onUngroupCard,
  onDeleteCard,
}: {
  card: RetroCard;
  userName: string;
  isModerator: boolean;
  selectedCardIds: string[];
  editingCard: { id: string; text: string } | null;
  retro: RetroData;
  onToggleCardSelection: (cardId: string) => void;
  onEditCardDraftChange: (cardId: string, text: string) => void;
  onSaveCardEdit: () => void;
  onCancelCardEdit: () => void;
  onVoteCard: (card: RetroCard) => void;
  onMoveCard: (cardId: string, columnId: string) => void;
  onStartCardEdit: (card: RetroCard) => void;
  onUngroupCard: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void;
}) {
  const isSelected = selectedCardIds.includes(card.id);

  return (
    <article
      key={card.id}
      data-testid="retro-card"
      className={cn(
        "rounded-xl border border-white/70 bg-white/90 p-3 text-slate-800 shadow-sm dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100",
        isSelected &&
          "border-brand-300 bg-brand-50/80 ring-2 ring-brand-300/50 dark:border-brand-300/60 dark:bg-brand-500/15",
      )}
    >
      {isModerator ? (
        <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleCardSelection(card.id)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-300"
          />
          {isSelected ? "Selected" : "Select"}
        </label>
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
          {isModerator ? (
            <select
              aria-label={`Move ${card.text}`}
              value={card.columnId}
              onChange={(event) => onMoveCard(card.id, event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
            >
              {retro.template.columns.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title}
                </option>
              ))}
            </select>
          ) : null}
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
