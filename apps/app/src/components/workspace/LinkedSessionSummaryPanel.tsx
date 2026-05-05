import { ClipboardCopy, Download, Link2, ListChecks } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui";
import { copyText } from "@/lib/clipboard";
import {
  buildLinkedSessionSummaries,
  type LinkedSessionSummary,
} from "@/lib/team-session-metadata";
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
  const recaps = buildLinkedSessionSummaries(sessions);

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
        {recaps.map((recap) => (
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
                {recap.planningFollowUps.length} follow-up
                {recap.planningFollowUps.length === 1 ? "" : "s"}
              </Badge>
            </div>

            {recap.planningFollowUps.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                {recap.planningFollowUps.slice(0, 3).map((followUp) => (
                  <li
                    key={`${followUp.source}-${followUp.ticketKey ?? ""}-${followUp.title}`}
                    className="flex gap-2"
                  >
                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />
                    <span>
                      {followUp.title}
                      {followUp.ticketKey ? (
                        <span className="text-slate-400">
                          {" "}
                          [{followUp.ticketKey}]
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                No planning follow-ups captured.
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
