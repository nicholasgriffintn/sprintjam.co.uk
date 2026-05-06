import {
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Filter,
  Flag,
  Plus,
  RefreshCcw,
} from "lucide-react";
import type {
  WorkspaceActionsPage,
  WorkspaceProcessLoop,
} from "@sprintjam/types";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  formatActionSource,
  formatActionStatus,
  getActionAge,
  getStatusVariant,
  sourceOptions,
  statusOptions,
} from "./workspace-action-board-model";
import { useWorkspaceActionBoard } from "./useWorkspaceActionBoard";

interface WorkspaceActionBoardProps {
  teamId: number;
  actionsPage: WorkspaceActionsPage | null;
  processLoops: WorkspaceProcessLoop[];
}

export function WorkspaceActionBoard({
  teamId,
  actionsPage,
  processLoops,
}: WorkspaceActionBoardProps) {
  const {
    actions,
    activeLoops,
    counts,
    filters: { selectedLoopId, sourceFilter, statusFilter },
    form: { newActionTitle, setNewActionTitle },
    handlers: {
      createAction: handleCreateAction,
      refreshActions,
      setLoopFilter: handleLoopChange,
      setSourceFilter: handleSourceChange,
      setStatusFilter: handleStatusChange,
      updateActionStatus: handleUpdateActionStatus,
    },
    pending: { isCreatingAction, isRefreshing, updatingActionId },
  } = useWorkspaceActionBoard({ teamId, actionsPage, processLoops });
  const openActions = counts.open + counts.in_progress;

  return (
    <section className="space-y-4 border-y border-slate-100 py-4 dark:border-slate-800">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ClipboardList className="h-4 w-4 text-brand-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Sprint actions
            </h3>
            <Badge variant="info" size="sm">
              {openActions} open
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Today&apos;s action loop connects planning follow-ups, standup
            blockers, and wheel outcomes.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900/40">
            <input
              value={newActionTitle}
              onChange={(event) => setNewActionTitle(event.target.value)}
              placeholder="Add manual action"
              className="min-w-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
            />
            <Button
              size="sm"
              variant="unstyled"
              icon={<Plus className="h-4 w-4" />}
              isLoading={isCreatingAction}
              disabled={!newActionTitle.trim()}
              className="rounded-full px-2 py-1 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-200"
              onClick={() => void handleCreateAction()}
            >
              Add
            </Button>
          </div>
          <Button
            size="sm"
            variant="secondary"
            icon={<RefreshCcw className="h-4 w-4" />}
            isLoading={isRefreshing}
            onClick={() => void refreshActions()}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2 text-sm">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleStatusChange(option.value)}
              className={`rounded-full border px-3 py-1.5 text-left transition ${
                statusFilter === option.value
                  ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-200"
                  : "border-slate-200 bg-white/60 text-slate-600 hover:border-brand-200 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300"
              }`}
            >
              <span className="font-medium">{option.label}</span>{" "}
              <span className="text-slate-400 dark:text-slate-500">
                {counts[option.value]}
              </span>
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[520px]">
          <label className="sr-only" htmlFor="workspace-action-source">
            Source
          </label>
          <Select
            id="workspace-action-source"
            value={sourceFilter}
            onValueChange={handleSourceChange}
            options={sourceOptions}
          />
          <label className="sr-only" htmlFor="workspace-action-loop">
            Process loop
          </label>
          <Select
            id="workspace-action-loop"
            value={selectedLoopId ? String(selectedLoopId) : "all"}
            onValueChange={handleLoopChange}
            options={[
              { label: "All loops", value: "all" },
              ...activeLoops.map((loop) => ({
                label: loop.name,
                value: String(loop.id),
              })),
            ]}
          />
        </div>
      </div>

      {actions.length ? (
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
          {actions.map((action) => (
            <div
              key={action.id}
              className="grid gap-3 px-3 py-2.5 lg:grid-cols-[1fr_auto]"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={getStatusVariant(action.status)} size="sm">
                    {formatActionStatus(action.status)}
                  </Badge>
                  <Badge variant="default" size="sm">
                    <Filter className="mr-1 h-3 w-3" />
                    {formatActionSource(action.source)}
                  </Badge>
                  {action.priority === "high" ? (
                    <Badge variant="error" size="sm">
                      <Flag className="mr-1 h-3 w-3" />
                      High
                    </Badge>
                  ) : null}
                  <span className="text-xs text-slate-400">
                    Updated {getActionAge(action.updatedAt)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {action.title}
                  </p>
                  {action.detail ? (
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {action.detail}
                    </p>
                  ) : null}
                  {action.ownerName ? (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Owner: {action.ownerName}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                {action.status === "open" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<CircleDot className="h-4 w-4" />}
                    isLoading={updatingActionId === action.id}
                    onClick={() =>
                      void handleUpdateActionStatus(action, "in_progress")
                    }
                  >
                    Start
                  </Button>
                ) : null}
                {action.status !== "resolved" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    isLoading={updatingActionId === action.id}
                    onClick={() =>
                      void handleUpdateActionStatus(action, "resolved")
                    }
                  >
                    Resolve
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          No actions match current filters. Follow-ups, blockers, and wheel
          outcomes will appear here automatically.
        </div>
      )}
    </section>
  );
}
