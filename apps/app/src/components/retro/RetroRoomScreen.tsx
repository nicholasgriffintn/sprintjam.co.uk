import { useEffect, useMemo, useState } from "react";
import type { RetroData, RetroPhase } from "@sprintjam/types";
import { CheckCircle2, Plus, ThumbsUp } from "lucide-react";

import { useRetroHeader } from "@/context/RetroHeaderContext";
import { getStoredUserName } from "@/hooks/useUserPersistence";
import {
  addRetroAction,
  completeRetro,
  connectRetroWebSocket,
  deleteRetroCard,
  disconnectRetroWebSocket,
  sendRetroCard,
  setRetroPhase,
  setRetroReady,
  voteRetroCard,
} from "@/lib/retro-api-service";
import { completeSessionByRoomKey } from "@/lib/workspace-service";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BetaBadge } from "@/components/BetaBadge";
import { cn } from "@/lib/cn";

interface RetroRoomScreenProps {
  retroKey: string;
}

const phaseOrder: RetroPhase[] = ["input", "review", "focus", "completed"];

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

export function RetroRoomScreen({ retroKey }: RetroRoomScreenProps) {
  const userName = useMemo(() => getStoredUserName(), []);
  const {
    setRetroKey,
    setPhase: setHeaderPhase,
    setStatus: setHeaderStatus,
    setParticipantCount,
  } = useRetroHeader();
  const [retro, setRetro] = useState<RetroData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [actionTitle, setActionTitle] = useState("");

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
    };
  }, [
    retro,
    retroKey,
    setHeaderPhase,
    setHeaderStatus,
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

  const addCard = (columnId: string) => {
    const text = drafts[columnId]?.trim();
    if (!text) return;
    sendRetroCard(columnId, text);
    setDrafts((current) => ({ ...current, [columnId]: "" }));
  };

  const addAction = () => {
    const title = actionTitle.trim();
    if (!title) return;
    addRetroAction(title);
    setActionTitle("");
  };

  const handleNextPhase = () => {
    if (nextPhase === "completed") {
      completeRetro();
      void completeSessionByRoomKey(retro.key, "retro").catch(
        (completionError) => {
          console.warn("Retro completed without workspace completion sync", {
            completionError,
          });
        },
      );
      return;
    }

    setRetroPhase(nextPhase);
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[radial-gradient(circle_at_1px_1px,rgba(100,116,139,0.26)_1px,transparent_0)] [background-size:28px_28px] px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <section className="flex flex-col gap-3 rounded-2xl border border-white/60 bg-white/85 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/70 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-300">
                {retro.template.name}
              </p>
              <BetaBadge />
            </div>
            <h1 className="text-2xl font-black text-slate-950 dark:text-white">
              {retro.phase === "completed" ? "Retro completed" : "Retro board"}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {phaseOrder.map((phase) => (
              <Button
                key={phase}
                type="button"
                size="sm"
                variant={retro.phase === phase ? "primary" : "secondary"}
                disabled={
                  phase === "completed" ||
                  (!isModerator && !retro.settings.allowParticipantPhaseControl)
                }
                onClick={() => setRetroPhase(phase)}
              >
                {phase}
              </Button>
            ))}
            {retro.phase !== "completed" ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => handleNextPhase()}
                disabled={
                  !isModerator && !retro.settings.allowParticipantPhaseControl
                }
              >
                Next
              </Button>
            ) : null}
          </div>
        </section>

        {error ? <Alert variant="warning">{error}</Alert> : null}

        <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${retro.template.columns.length}, minmax(220px, 1fr))`,
            }}
          >
            {retro.template.columns.map((column) => {
              const cards = retro.cards.filter(
                (card) => card.columnId === column.id,
              );
              return (
                <div
                  key={column.id}
                  className={cn(
                    "flex min-h-[620px] flex-col rounded-2xl border border-dashed p-4",
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

                  <div className="flex flex-1 flex-col gap-3 py-4">
                    {cards.map((card) => (
                      <article
                        key={card.id}
                        className="rounded-xl border border-white/70 bg-white/90 p-3 text-slate-800 shadow-sm dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100"
                      >
                        <p className="text-sm">{card.text}</p>
                        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{card.author || "Anonymous"}</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => voteRetroCard(card.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 font-semibold dark:bg-white/10"
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                              {card.votes.length}
                            </button>
                            {card.author === userName || isModerator ? (
                              <button
                                type="button"
                                onClick={() => deleteRetroCard(card.id)}
                                className="font-semibold text-rose-600 dark:text-rose-300"
                              >
                                Delete
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>

                  {retro.phase === "input" ? (
                    <div className="mt-auto space-y-2">
                      <textarea
                        value={drafts[column.id] ?? ""}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [column.id]: event.target.value,
                          }))
                        }
                        className="min-h-24 w-full rounded-xl border border-white/70 bg-white/90 p-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-brand-200 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        fullWidth
                        icon={<Plus className="h-4 w-4" />}
                        onClick={() => addCard(column.id)}
                      >
                        Add card
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
              <h2 className="font-bold text-slate-950 dark:text-white">
                Participants
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {retro.users.map((user) => (
                  <span
                    key={user}
                    className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200"
                  >
                    {user}
                  </span>
                ))}
              </div>
              <Button
                type="button"
                variant={isReady ? "primary" : "secondary"}
                fullWidth
                className="mt-4"
                icon={<CheckCircle2 className="h-4 w-4" />}
                onClick={() => setRetroReady(!isReady)}
              >
                {isReady ? "Ready" : "I am ready"}
              </Button>
            </div>

            <div className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
              <h2 className="font-bold text-slate-950 dark:text-white">
                Actions
              </h2>
              <div className="mt-3 space-y-2">
                {retro.actionItems.map((action) => (
                  <div
                    key={action.id}
                    className="rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-white/5"
                  >
                    {action.title}
                  </div>
                ))}
              </div>
              {retro.phase === "focus" ? (
                <div className="mt-4 space-y-2">
                  <Input
                    value={actionTitle}
                    onChange={(event) => setActionTitle(event.target.value)}
                    placeholder="Follow up action"
                    fullWidth
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    onClick={addAction}
                  >
                    Add action
                  </Button>
                </div>
              ) : null}
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
