import { useEffect, useState, type FormEvent } from "react";
import type {
  LinkedTicket,
  StandupData,
  StandupResponse,
  StandupResponsePayload,
} from "@sprintjam/types";
import {
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  Link as LinkIcon,
  Lock,
  Pencil,
  Save,
  History,
  Calendar,
} from 'lucide-react';

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StandupTicketLinker } from "@/components/standup/StandupTicketLinker";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { cn } from "@/lib/cn";

interface StandupResponseFormProps {
  response?: StandupResponse;
  status: StandupData["status"];
  teamId?: number;
  isModeratorView: boolean;
  isSocketConnected: boolean;
  onSubmit: (payload: StandupResponsePayload) => void;
}

interface DraftState {
  yesterday: string;
  today: string;
  hasBlocker: boolean | null;
  blockerDescription: string;
  healthCheck: number;
  linkedTickets: LinkedTicket[];
}

const HEALTH_OPTIONS = [
  { value: 1, label: "1", copy: "Running on fumes" },
  { value: 2, label: "2", copy: "Low energy" },
  { value: 3, label: "3", copy: "Steady" },
  { value: 4, label: "4", copy: "Strong" },
  { value: 5, label: "5", copy: "Excellent" },
] as const;

function getDraftState(response?: StandupResponse): DraftState {
  return {
    yesterday: response?.yesterday ?? '',
    today: response?.today ?? '',
    hasBlocker: response?.hasBlocker ?? null,
    blockerDescription: response?.blockerDescription ?? '',
    healthCheck: response?.healthCheck ?? 3,
    linkedTickets: response?.linkedTickets ?? [],
  };
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

export function StandupResponseForm({
  response,
  status,
  teamId,
  isModeratorView,
  isSocketConnected,
  onSubmit,
}: StandupResponseFormProps) {
  const [draft, setDraft] = useState<DraftState>(() => getDraftState(response));
  const [isEditing, setIsEditing] = useState(() => !response);

  useEffect(() => {
    if (!response) {
      setDraft(getDraftState(undefined));
      setIsEditing(true);
      return;
    }

    if (!isEditing) {
      setDraft(getDraftState(response));
    }
  }, [isEditing, response]);

  const isCompleted = status === "completed";
  const isLocked = status === "locked" && !isModeratorView;
  const isReadOnly = isCompleted || isLocked;
  const blockerAnswer = draft.blockerDescription.trim();
  const formInvalid =
    draft.yesterday.trim().length === 0 ||
    draft.today.trim().length === 0 ||
    draft.hasBlocker === null ||
    (draft.hasBlocker && blockerAnswer.length === 0);
  const isSubmitDisabled = !isSocketConnected || isReadOnly || formInvalid;
  const showReadOnly = !!response && !isEditing;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitDisabled) {
      return;
    }
    if (draft.hasBlocker === null) {
      return;
    }

    onSubmit({
      yesterday: draft.yesterday.trim(),
      today: draft.today.trim(),
      hasBlocker: draft.hasBlocker,
      blockerDescription: draft.hasBlocker ? blockerAnswer : undefined,
      healthCheck: draft.healthCheck,
      linkedTickets:
        draft.linkedTickets.length > 0 ? draft.linkedTickets : undefined,
    });

    setIsEditing(false);
  };

  return (
    <SurfaceCard className="space-y-5">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Your response
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {response ? (
            <Badge variant="success">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Saved at {formatTime(response.updatedAt)}
            </Badge>
          ) : null}
          {isLocked ? (
            <Badge variant="warning">
              <Lock className="mr-1 h-3 w-3" />
              Locked
            </Badge>
          ) : null}
        </div>
      </div>

      {isCompleted ? (
        <Alert variant="info">
          This standup is complete. Responses are now read-only history.
        </Alert>
      ) : null}

      {isLocked ? (
        <Alert variant="warning">
          Responses are locked by the facilitator. Your existing update remains
          visible to them, but you cannot change it right now.
        </Alert>
      ) : null}

      {showReadOnly ? (
        <div className="space-y-4">
          <div className="rounded-[1.75rem] border border-black/5 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Yesterday
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
              {draft.yesterday}
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-black/5 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Today
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
              {draft.today}
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-black/5 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Health
              </div>
              <Badge variant="info">
                <HeartPulse className="mr-1 h-3 w-3" />
                {draft.healthCheck}/5
              </Badge>
            </div>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
              {
                HEALTH_OPTIONS.find(
                  (option) => option.value === draft.healthCheck,
                )?.copy
              }
            </p>
          </div>

          <div
            className={cn(
              'rounded-[1.75rem] border p-4',
              draft.hasBlocker
                ? 'border-rose-200/80 bg-rose-50/90 dark:border-rose-400/20 dark:bg-rose-950/20'
                : 'border-black/5 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]',
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Blockers
              </div>
              <Badge variant={draft.hasBlocker ? 'error' : 'success'}>
                {draft.hasBlocker ? 'Needs help' : 'Clear path'}
              </Badge>
            </div>
            <p
              className={cn(
                'mt-2 whitespace-pre-wrap text-sm leading-6',
                draft.hasBlocker
                  ? 'text-rose-800 dark:text-rose-100'
                  : 'text-slate-700 dark:text-slate-200',
              )}
            >
              {draft.hasBlocker
                ? draft.blockerDescription
                : 'No blockers shared.'}
            </p>
          </div>

          {draft.linkedTickets.length ? (
            <div className="rounded-[1.75rem] border border-black/5 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                <LinkIcon className="h-3.5 w-3.5" />
                Linked tickets
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {draft.linkedTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="rounded-full border border-black/5 bg-white/70 px-3 py-2 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-200"
                  >
                    <span className="font-semibold">{ticket.key}</span>
                    <span className="ml-2 text-slate-500 dark:text-slate-300">
                      {ticket.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <Button
            variant="secondary"
            onClick={() => setIsEditing(true)}
            disabled={isReadOnly || !isSocketConnected}
            icon={<Pencil className="h-4 w-4" />}
            fullWidth
          >
            Edit update
          </Button>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <section className="space-y-2">
            <label
              htmlFor="standup-yesterday"
              className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Yesterday
            </label>
            <textarea
              id="standup-yesterday"
              value={draft.yesterday}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  yesterday: event.target.value,
                }))
              }
              rows={4}
              placeholder="What moved forward yesterday?"
              className="w-full rounded-[1.75rem] border border-white/50 bg-white/80 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-200 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-900"
              disabled={!isSocketConnected || isReadOnly}
            />
          </section>

          <section className="space-y-2">
            <label
              htmlFor="standup-today"
              className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Today
            </label>
            <textarea
              id="standup-today"
              value={draft.today}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  today: event.target.value,
                }))
              }
              rows={4}
              placeholder="What are you doing today?"
              className="w-full rounded-[1.75rem] border border-white/50 bg-white/80 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-200 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-900"
              disabled={!isSocketConnected || isReadOnly}
            />
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Blockers
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    hasBlocker: false,
                    blockerDescription: '',
                  }))
                }
                className={cn(
                  'rounded-xl border px-4 py-2.5 text-sm font-medium transition',
                  !draft.hasBlocker
                    ? 'border-brand-300 bg-brand-50 text-brand-900 dark:border-brand-400 dark:bg-background/60 dark:text-foreground'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-brand-200 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200',
                )}
                disabled={!isSocketConnected || isReadOnly}
              >
                No blockers
              </button>
              <button
                type="button"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    hasBlocker: true,
                  }))
                }
                className={cn(
                  'rounded-xl border px-4 py-2.5 text-sm font-medium transition',
                  draft.hasBlocker
                    ? 'border-brand-300 bg-brand-50 text-brand-900 dark:border-brand-400 dark:bg-background/60 dark:text-foreground'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-brand-200 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200',
                )}
                disabled={!isSocketConnected || isReadOnly}
              >
                I have blockers
              </button>
            </div>
            {draft.hasBlocker === null ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select one option.
              </p>
            ) : null}
            {draft.hasBlocker ? (
              <textarea
                id="standup-blocker"
                value={draft.blockerDescription}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    blockerDescription: event.target.value,
                  }))
                }
                rows={3}
                placeholder="What is blocked and what help do you need?"
                className="w-full rounded-[1.5rem] border border-rose-200/80 bg-white/90 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-200 dark:border-rose-400/20 dark:bg-slate-950/60 dark:text-white"
                disabled={!isSocketConnected || isReadOnly}
              />
            ) : null}
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Health check
            </div>
            <div className="grid grid-cols-5 gap-2">
              {HEALTH_OPTIONS.map((option) => {
                const isSelected = draft.healthCheck === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        healthCheck: option.value,
                      }))
                    }
                    className={cn(
                      'rounded-[1.5rem] border px-3 py-3 text-left transition',
                      isSelected
                        ? 'border-brand-300 bg-brand-50 text-brand-900 dark:border-brand-400 dark:bg-background/60 dark:text-foreground'
                        : 'border-black/5 bg-white/70 text-slate-600 hover:border-brand-200 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:text-white',
                    )}
                    disabled={!isSocketConnected || isReadOnly}
                  >
                    <div className="text-lg font-semibold">{option.label}</div>
                    <div className="mt-1 text-[11px] leading-4">
                      {option.copy}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {teamId ? (
            <StandupTicketLinker
              teamId={teamId}
              linkedTickets={draft.linkedTickets}
              onChange={(linkedTickets) =>
                setDraft((current) => ({
                  ...current,
                  linkedTickets,
                }))
              }
              disabled={!isSocketConnected || isReadOnly}
            />
          ) : null}

          <Button
            type="submit"
            fullWidth
            disabled={isSubmitDisabled}
            icon={<Save className="h-4 w-4" />}
          >
            {response ? 'Save changes' : 'Save update'}
          </Button>
        </form>
      )}
    </SurfaceCard>
  );
}
