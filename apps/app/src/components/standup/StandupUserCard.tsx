import type { StandupResponse } from "@sprintjam/types";
import {
  AlertTriangle,
  Clock3,
  Crosshair,
  HeartPulse,
  Link as LinkIcon,
  MessageSquareHeart,
  Sparkles,
  Trophy,
} from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type StandupUserCardVariant = "default" | "presentation";

const REACTION_EMOJIS = ["👏", "🎉", "💡", "❤️"] as const;

interface StandupUserCardProps {
  response: StandupResponse;
  avatar?: string;
  variant?: StandupUserCardVariant;
  isFocused?: boolean;
  canFocus?: boolean;
  onFocus?: (userName: string) => void;
  isFirstSubmitter?: boolean;
  reactions?: Record<string, string[]>; // emoji → [reactingUserNames]
  onAddReaction?: (emoji: string) => void;
  onRemoveReaction?: (emoji: string) => void;
  currentUserName?: string;
}

const HEALTH_COPY: Record<number, string> = {
  1: "Running on fumes",
  2: "Low energy",
  3: "Steady",
  4: "Strong",
  5: "Excellent",
};

const HEALTH_TONES: Record<number, string> = {
  1: "bg-rose-500",
  2: "bg-orange-500",
  3: "bg-amber-500",
  4: "bg-emerald-500",
  5: "bg-sky-500",
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

export function StandupUserCard({
  response,
  avatar,
  variant = "default",
  isFocused = false,
  canFocus = false,
  onFocus,
  isFirstSubmitter = false,
  reactions,
  onAddReaction,
  onRemoveReaction,
  currentUserName,
}: StandupUserCardProps) {
  const isPresentation = variant === "presentation";
  const healthWidth = `${Math.max(1, Math.min(5, response.healthCheck)) * 20}%`;
  const focusButtonLabel = isFocused ? "First speaker" : "Set first";
  const focusBadgeLabel = isPresentation ? "Live" : "First up";
  const showReactions =
    !!onAddReaction ||
    !!onRemoveReaction ||
    (reactions && Object.keys(reactions).length > 0);

  return (
    <article
      className={cn(
        "rounded-2xl border transition-all",
        isPresentation
          ? "border-brand-300/60 bg-white p-8 shadow-lg dark:border-brand-500/30 dark:bg-slate-900/80"
          : "border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50",
        isFocused &&
          "ring-2 ring-brand-300 ring-offset-2 ring-offset-transparent",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar
            src={avatar}
            alt={response.userName}
            fallback={getInitials(response.userName)}
            className={cn(
              "shrink-0 border border-slate-200 bg-brand-100 text-brand-900 dark:border-slate-700 dark:bg-brand-500/20 dark:text-brand-100",
              isPresentation
                ? "h-16 w-16 text-lg font-semibold"
                : "h-12 w-12 text-sm font-semibold",
            )}
            fallbackClassName="bg-transparent"
          />

          <div className="min-w-0">
            <div
              className={cn(
                "truncate font-semibold tracking-tight text-slate-900 dark:text-white",
                isPresentation ? "text-3xl" : "text-lg",
              )}
            >
              {response.userName}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                Updated {formatTime(response.updatedAt)}
              </span>
              <Badge variant="info" size="sm">
                <HeartPulse className="mr-1 h-3 w-3" />
                Health {response.healthCheck}/5
              </Badge>
              {response.hasBlocker ? (
                <Badge variant="error" size="sm">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Blocker
                </Badge>
              ) : null}
              {isFirstSubmitter ? (
                <Badge variant="warning" size="sm">
                  <Trophy className="mr-1 h-3 w-3" />
                  First in!
                </Badge>
              ) : null}
              {isFocused ? (
                <Badge variant={isPresentation ? "primary" : "info"} size="sm">
                  {focusBadgeLabel}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        {canFocus && onFocus ? (
          <Button
            variant={isFocused ? "primary" : "secondary"}
            size="sm"
            onClick={() => onFocus(response.userName)}
            icon={<Crosshair className="h-4 w-4" />}
          >
            {focusButtonLabel}
          </Button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Team health
            </span>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {HEALTH_COPY[response.healthCheck] ?? "Steady"}
            </span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-200/80 dark:bg-white/10">
            <div
              className={cn(
                "h-full rounded-full transition-[width]",
                HEALTH_TONES[response.healthCheck] ?? HEALTH_TONES[3],
              )}
              style={{ width: healthWidth }}
            />
          </div>
        </div>

        <div
          className={cn("grid gap-4", isPresentation ? "lg:grid-cols-2" : "")}
        >
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Yesterday
            </h3>
            <p
              className={cn(
                "mt-3 whitespace-pre-wrap text-slate-700 dark:text-slate-200",
                isPresentation ? "text-lg leading-8" : "text-sm leading-6",
              )}
            >
              {response.yesterday}
            </p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Today
            </h3>
            <p
              className={cn(
                "mt-3 whitespace-pre-wrap text-slate-700 dark:text-slate-200",
                isPresentation ? "text-lg leading-8" : "text-sm leading-6",
              )}
            >
              {response.today}
            </p>
          </section>
        </div>

        {response.hasBlocker ? (
          <section className="rounded-xl border border-rose-200/80 bg-rose-50/90 p-4 dark:border-rose-400/20 dark:bg-rose-950/20">
            <div className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-200">
              <AlertTriangle className="h-4 w-4" />
              Blocker
            </div>
            <p
              className={cn(
                "mt-3 whitespace-pre-wrap text-rose-800 dark:text-rose-100",
                isPresentation ? "text-lg leading-8" : "text-sm leading-6",
              )}
            >
              {response.blockerDescription ||
                "Blocker flagged without extra detail."}
            </p>
          </section>
        ) : null}

        {response.kudos ? (
          <section className="rounded-xl border border-amber-200/80 bg-amber-50/90 p-4 dark:border-amber-400/20 dark:bg-amber-950/20">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-200">
              <MessageSquareHeart className="h-4 w-4" />
              Kudos
            </div>
            <p
              className={cn(
                "mt-3 whitespace-pre-wrap text-amber-900 dark:text-amber-100",
                isPresentation ? "text-lg leading-8" : "text-sm leading-6",
              )}
            >
              {response.kudos}
            </p>
          </section>
        ) : null}

        {response.icebreakerAnswer ? (
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Sparkles className="h-3.5 w-3.5" />
              Icebreaker
            </div>
            <p
              className={cn(
                "mt-3 whitespace-pre-wrap text-slate-700 dark:text-slate-200",
                isPresentation ? "text-lg leading-8" : "text-sm leading-6",
              )}
            >
              {response.icebreakerAnswer}
            </p>
          </section>
        ) : null}

        {response.linkedTickets?.length ? (
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <LinkIcon className="h-3.5 w-3.5" />
              Linked tickets
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {response.linkedTickets.map((ticket) => {
                const content = (
                  <>
                    <span className="font-semibold">{ticket.key}</span>
                    <span className="truncate text-slate-500 dark:text-slate-300">
                      {ticket.title}
                    </span>
                  </>
                );

                return ticket.url ? (
                  <a
                    key={`${response.userName}-${ticket.id}`}
                    href={ticket.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:text-brand-200"
                  >
                    {content}
                  </a>
                ) : (
                  <div
                    key={`${response.userName}-${ticket.id}`}
                    className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {showReactions ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {REACTION_EMOJIS.map((emoji) => {
              const reactors = reactions?.[emoji] ?? [];
              const hasReacted = currentUserName
                ? reactors.some(
                    (u) => u.toLowerCase() === currentUserName.toLowerCase(),
                  )
                : false;
              const count = reactors.length;

              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    if (hasReacted) {
                      onRemoveReaction?.(emoji);
                    } else {
                      onAddReaction?.(emoji);
                    }
                  }}
                  disabled={!onAddReaction && !onRemoveReaction}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition",
                    hasReacted
                      ? "border-brand-300 bg-brand-50 font-medium text-brand-900 dark:border-brand-400/60 dark:bg-brand-900/20 dark:text-brand-100"
                      : "border-slate-200 bg-white text-slate-700 hover:border-brand-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
                    !onAddReaction && !onRemoveReaction && "cursor-default",
                  )}
                >
                  <span>{emoji}</span>
                  {count > 0 ? (
                    <span className="text-xs font-medium">{count}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </article>
  );
}
