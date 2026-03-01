import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ScrollArea } from "@/components/ui";
import type { RoomGameSession } from "@/types";

interface CategoryBlitzGamePanelProps {
  gameSession: RoomGameSession;
  userName: string;
  onSubmitMove: (value: string) => void;
}

export const CategoryBlitzGamePanel = ({
  gameSession,
  onSubmitMove,
}: CategoryBlitzGamePanelProps) => {
  const [moveValue, setMoveValue] = useState("");

  const isActive = gameSession.status === "active";

  return (
    <>
      {isActive ? (
        <div className="rounded-xl border border-brand-200/80 bg-brand-50/70 p-3 text-sm text-brand-900 dark:border-brand-300/30 dark:bg-brand-900/20 dark:text-brand-100">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
            Category Blitz
          </p>
          <p className="mt-1 font-medium">
            {gameSession.categoryBlitzCategory ?? "Category"} · Letter{" "}
            {(gameSession.categoryBlitzLetter ?? "?").toUpperCase()}
          </p>
        </div>
      ) : null}

      {isActive ? (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!moveValue.trim()) return;
            onSubmitMove(moveValue);
            setMoveValue("");
          }}
        >
          <input
            value={moveValue}
            onChange={(event) => setMoveValue(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none dark:border-white/15 dark:bg-slate-900 dark:text-white"
            placeholder="Submit an answer that matches the category"
            maxLength={48}
          />
          <Button type="submit">Play</Button>
        </form>
      ) : null}

      {!isActive && (gameSession.categoryBlitzRoundHistory?.length ?? 0) > 0 ? (
        <div className="space-y-2 rounded-xl border border-slate-200/80 p-3 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Round Summary
          </p>
          <ScrollArea
            className="max-h-60 text-sm"
            contentClassName="space-y-2 pr-3"
            aria-label="Category blitz round history"
          >
            {gameSession.categoryBlitzRoundHistory?.map((round) => (
              <div
                key={round.round}
                className="rounded-lg border border-slate-200/70 p-2 dark:border-white/10"
              >
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  Round {round.round}: {round.category} ({round.letter})
                </p>
                {Object.entries(round.submissions).map(([player, answer]) => (
                  <p
                    key={player}
                    className="text-slate-700 dark:text-slate-200"
                  >
                    {player}: {String(answer)}
                  </p>
                ))}
              </div>
            ))}
          </ScrollArea>
        </div>
      ) : null}
    </>
  );
};
