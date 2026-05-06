import {
  CheckCircle2,
  ClipboardCopy,
  Download,
  Link2,
  ListChecks,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui";
import { copyText } from "@/lib/clipboard";
import {
  buildLinkedSessionRecapActions,
  buildLinkedSessionSummaries,
  filterLinkedSessionSummaryActions,
  type LinkedSessionSummary,
} from "@/lib/team-session-metadata";
import { resolveTeamSessionRecapAction } from "@/lib/workspace-service";
import { downloadTextFile } from "@/utils/download";
import type { TeamSession } from "@sprintjam/types";

interface LinkedSessionSummaryPanelProps {
  sessions: TeamSession[];
}

function buildCombinedRecapText(recaps: LinkedSessionSummary[]) {
  return recaps.map((recap) => recap.recapText).join("\n\n---\n\n");
}

function formatSessionTypes(recap: LinkedSessionSummary) {
  return recap.sessionTypes
    .map((type) => (type === "standup" ? "standup" : type))
    .join(" + ");
}

export function LinkedSessionSummaryPanel({
  sessions,
}: LinkedSessionSummaryPanelProps) {
  const [hiddenActionIds, setHiddenActionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [resolvingActionId, setResolvingActionId] = useState<string | null>(
    null,
  );
  const recaps = buildLinkedSessionSummaries(sessions).map((recap) =>
    filterLinkedSessionSummaryActions(recap, hiddenActionIds),
  );

  if (recaps.length === 0) {
    return null;
  }

  const recapText = buildCombinedRecapText(recaps);

  const handleCopy = async () => {
    try {
      await copyText(recapText);
      toast.success("Session summary copied");
    } catch {
      toast.error("Couldn't copy session summary");
    }
  };

  const handleExport = () => {
    downloadTextFile("sprintjam-linked-session-summary.txt", recapText);
  };

  const handleResolveAction = async (
    action: ReturnType<typeof buildLinkedSessionRecapActions>[number],
  ) => {
    setResolvingActionId(action.id);
    try {
      await resolveTeamSessionRecapAction(action.teamId, action.sessionId, {
        actionId: action.id,
        kind: action.kind,
      });
      setHiddenActionIds((current) => {
        const next = new Set(current);
        next.add(action.id);
        return next;
      });
      toast.success("Recap action resolved");
    } catch {
      toast.error("Couldn't resolve recap action");
    } finally {
      setResolvingActionId(null);
    }
  };

  return (
    <section className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-brand-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Linked summary
            </h3>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            size="sm"
            variant="secondary"
            icon={<ClipboardCopy className="h-4 w-4" />}
            onClick={() => void handleCopy()}
          >
            Copy
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={<Download className="h-4 w-4" />}
            onClick={handleExport}
          >
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        {recaps.map((recap) => {
          const actions = buildLinkedSessionRecapActions(recap).filter(
            (action) => !hiddenActionIds.has(action.id),
          );

          return (
            <div
              key={recap.context.id}
              className="rounded-md border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {recap.context.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {recap.sessions.length} linked sessions ·{" "}
                    {formatSessionTypes(recap)}
                  </p>
                </div>
                <Badge variant="info" size="sm" className="w-fit">
                  <ListChecks className="mr-1.5 h-3 w-3" />
                  {actions.length} action{actions.length === 1 ? "" : "s"}
                </Badge>
              </div>

              {actions.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  {actions.slice(0, 6).map((action) => (
                    <li key={action.id} className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />
                      <span className="min-w-0 flex-1">
                        {action.title}
                        {action.detail ? (
                          <span className="text-slate-400">
                            {" "}
                            · {action.detail}
                          </span>
                        ) : null}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        iconOnly
                        aria-label={`Resolve ${action.title}`}
                        title="Resolve action"
                        isLoading={resolvingActionId === action.id}
                        disabled={Boolean(
                          resolvingActionId &&
                            resolvingActionId !== action.id,
                        )}
                        className="h-7 w-7 shrink-0 rounded-md border-slate-200 p-1 text-slate-500 shadow-none hover:text-emerald-600 dark:border-slate-700 dark:text-slate-400 dark:hover:text-emerald-300"
                        icon={<CheckCircle2 className="h-4 w-4" />}
                        onClick={() => void handleResolveAction(action)}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  No linked actions captured.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
