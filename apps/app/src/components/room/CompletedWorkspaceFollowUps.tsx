import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import { Building2, LogIn, Plus } from "lucide-react";
import type { TeamSession } from "@sprintjam/types";

import { BetaBadge } from "@/components/BetaBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { useSessionActions } from "@/context/SessionContext";
import { useWorkspaceAuth } from "@/context/WorkspaceAuthContext";
import { setReturnUrl } from "@/config/routes";
import { cn } from "@/lib/cn";
import {
  createTeamSession,
  recordPlanningActionsByRoomKey,
} from "@/lib/workspace-service";
import {
  buildTeamSessionMetadata,
  parsePlanningFollowUpText,
} from "@/lib/team-session-metadata";

interface CompletedWorkspaceFollowUpsProps {
  roomKey: string;
  suggestedName: string;
  linkedWorkspaceSession: TeamSession | null;
  linkedWorkspaceTeamName: string | null;
  onWorkspaceSessionSaved: (session: TeamSession) => void;
  onOpenRenameWorkspaceSession: () => void;
}

export function CompletedWorkspaceFollowUps({
  roomKey,
  suggestedName,
  linkedWorkspaceSession,
  linkedWorkspaceTeamName,
  onWorkspaceSessionSaved,
  onOpenRenameWorkspaceSession,
}: CompletedWorkspaceFollowUpsProps) {
  const { isAuthenticated, isLoading, teams } = useWorkspaceAuth();
  const { goToLogin } = useSessionActions();
  const location = useLocation();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [sessionName, setSessionName] = useState(suggestedName);
  const [followUpsText, setFollowUpsText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const followUps = useMemo(
    () => parsePlanningFollowUpText(followUpsText).map((title) => ({ title })),
    [followUpsText],
  );
  const canSaveFollowUps = followUps.length > 0;

  useEffect(() => {
    setSessionName(linkedWorkspaceSession?.name ?? suggestedName);
  }, [linkedWorkspaceSession?.name, suggestedName]);

  useEffect(() => {
    if (linkedWorkspaceSession) {
      setSelectedTeamId(linkedWorkspaceSession.teamId);
      return;
    }

    setSelectedTeamId(teams.length === 1 ? (teams[0]?.id ?? null) : null);
  }, [linkedWorkspaceSession, teams]);

  const handleLoginClick = () => {
    setReturnUrl(location.pathname);
    goToLogin();
  };

  const handleSave = async () => {
    const name = sessionName.trim();
    if (isSaving || !canSaveFollowUps) return;
    if (!linkedWorkspaceSession && (!selectedTeamId || !name)) return;

    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      if (linkedWorkspaceSession) {
        await recordPlanningActionsByRoomKey({
          roomKey,
          followUps,
        });
      } else {
        const session = await createTeamSession(
          selectedTeamId!,
          name,
          roomKey,
          buildTeamSessionMetadata({
            type: "planning",
            teamId: selectedTeamId!,
          }),
        );
        await recordPlanningActionsByRoomKey({
          roomKey,
          followUps,
        });
        onWorkspaceSessionSaved(session);
      }

      setFollowUpsText("");
      setNotice("Follow-ups added to sprint actions.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add follow-ups",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
        Checking workspace...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <SurfaceCard
        variant="subtle"
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Save follow-ups to Workspace <BetaBadge />
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Sign in to turn post-session follow-ups into sprint actions.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          icon={<LogIn className="h-4 w-4" />}
          onClick={handleLoginClick}
        >
          Sign in
        </Button>
      </SurfaceCard>
    );
  }

  const needsTeamSelection = !linkedWorkspaceSession;
  const isSaveDisabled =
    isSaving ||
    !canSaveFollowUps ||
    (needsTeamSelection && (!selectedTeamId || !sessionName.trim()));

  return (
    <div className="space-y-4" data-testid="completed-workspace-follow-ups">
      {linkedWorkspaceSession ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">
              Saved to workspace
              {linkedWorkspaceTeamName ? ` in ${linkedWorkspaceTeamName}` : ""}
              .
            </p>
            <p className="mt-1 text-emerald-800/90 dark:text-emerald-200/90">
              {linkedWorkspaceSession.name}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={onOpenRenameWorkspaceSession}
          >
            Rename
          </Button>
        </div>
      ) : (
        <SurfaceCard variant="subtle" className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-brand-100 p-2 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Save this planning session
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Link it once, then add follow-ups straight into sprint actions.
              </p>
            </div>
          </div>

          {teams.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white/70 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
              No teams yet. Create one in your workspace first.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {teams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => setSelectedTeamId(team.id)}
                  className={cn(
                    "rounded-xl border p-3 text-left text-sm transition",
                    selectedTeamId === team.id
                      ? "border-brand-300 bg-brand-50 text-brand-900 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-100"
                      : "border-slate-200 bg-white/70 text-slate-700 hover:border-brand-200 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-brand-800",
                  )}
                >
                  <span className="font-semibold">{team.name}</span>
                </button>
              ))}
            </div>
          )}

          <Input
            label="Session name"
            value={sessionName}
            onChange={(event) => setSessionName(event.target.value)}
            placeholder="Sprint planning"
            fullWidth
          />
        </SurfaceCard>
      )}

      <div className="space-y-3">
        <div>
          <label
            htmlFor="completed-planning-follow-ups"
            className="text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Follow-ups
          </label>
          <textarea
            id="completed-planning-follow-ups"
            data-testid="completed-follow-ups-textarea"
            value={followUpsText}
            onChange={(event) => setFollowUpsText(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-2xl border border-white/50 bg-white/80 px-4 py-3 text-base text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-brand-400 dark:focus:ring-brand-900"
            placeholder="One follow-up per line"
          />
        </div>

        {error ? <Alert variant="error">{error}</Alert> : null}
        {notice ? <Alert variant="success">{notice}</Alert> : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {followUps.length} follow-up{followUps.length === 1 ? "" : "s"}{" "}
            ready
          </p>
          <Button
            type="button"
            icon={<Plus className="h-4 w-4" />}
            isLoading={isSaving}
            disabled={isSaveDisabled}
            data-testid="completed-follow-ups-save"
            onClick={handleSave}
          >
            Add to sprint actions
          </Button>
        </div>
      </div>
    </div>
  );
}
