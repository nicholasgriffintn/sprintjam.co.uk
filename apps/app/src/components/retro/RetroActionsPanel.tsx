import type {
  RetroActionItem,
  RetroPhase,
  WorkspaceActionPriority,
} from "@sprintjam/types";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import { formatDateInputValue } from "@/utils/date";

interface ParticipantOption {
  value: string;
  label: string;
}

interface RetroActionsPanelProps {
  phase: RetroPhase;
  actionItems: RetroActionItem[];
  participantOptions: ParticipantOption[];
  actionTitle: string;
  actionOwner: string;
  actionDueDate: string;
  actionPriority: WorkspaceActionPriority;
  onActionTitleChange: (title: string) => void;
  onActionOwnerChange: (owner: string) => void;
  onActionDueDateChange: (dueDate: string) => void;
  onActionPriorityChange: (priority: WorkspaceActionPriority) => void;
  onAddAction: () => void;
  onToggleAction: (actionId: string, completed: boolean) => void;
  onUpdateActionOwner: (actionId: string, owner: string) => void;
  onUpdateActionDueDate: (actionId: string, value: string) => void;
  onUpdateActionPriority: (
    actionId: string,
    priority: WorkspaceActionPriority,
  ) => void;
}

const actionPriorityOptions: Array<{
  value: WorkspaceActionPriority;
  label: string;
}> = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
];

const fieldLabelClassName =
  "text-xs font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300";

export function RetroActionsPanel({
  phase,
  actionItems,
  participantOptions,
  actionTitle,
  actionOwner,
  actionDueDate,
  actionPriority,
  onActionTitleChange,
  onActionOwnerChange,
  onActionDueDateChange,
  onActionPriorityChange,
  onAddAction,
  onToggleAction,
  onUpdateActionOwner,
  onUpdateActionDueDate,
  onUpdateActionPriority,
}: RetroActionsPanelProps) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
      <h2 className="font-bold text-slate-950 dark:text-white">Actions</h2>
      <div className="mt-3 space-y-2">
        {actionItems.map((action) => (
          <div
            key={action.id}
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-white/5"
          >
            <div className="flex items-start gap-3">
              <button
                type="button"
                data-testid="retro-action-toggle"
                aria-pressed={action.completed}
                aria-label={
                  action.completed
                    ? `Mark ${action.title} incomplete`
                    : `Mark ${action.title} complete`
                }
                onClick={() => onToggleAction(action.id, !action.completed)}
                className={cn(
                  "mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                  action.completed
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-slate-300 bg-white dark:border-white/20 dark:bg-transparent",
                )}
              >
                {action.completed ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : null}
              </button>
              <span
                className={cn(
                  "min-w-0 flex-1",
                  action.completed &&
                    "text-slate-500 line-through dark:text-slate-400",
                )}
              >
                {action.title}
              </span>
            </div>
            <div className="grid gap-2">
              <div className="grid gap-1">
                <label
                  htmlFor={`retro-action-owner-${action.id}`}
                  className={fieldLabelClassName}
                >
                  Owner
                </label>
                <Select
                  id={`retro-action-owner-${action.id}`}
                  value={action.owner ?? ""}
                  options={[
                    { value: "", label: "Unassigned" },
                    ...participantOptions,
                  ]}
                  onValueChange={(value) =>
                    onUpdateActionOwner(action.id, value)
                  }
                  className="rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  id={`retro-action-due-date-${action.id}`}
                  label="Due date"
                  type="date"
                  value={formatDateInputValue(action.dueAt)}
                  onChange={(event) =>
                    onUpdateActionDueDate(action.id, event.target.value)
                  }
                  fullWidth
                  className="rounded-xl px-3 py-2 text-sm"
                />
                <div className="grid gap-1">
                  <label
                    htmlFor={`retro-action-priority-${action.id}`}
                    className={fieldLabelClassName}
                  >
                    Priority
                  </label>
                  <Select
                    id={`retro-action-priority-${action.id}`}
                    value={action.priority ?? "normal"}
                    options={actionPriorityOptions}
                    onValueChange={(value) =>
                      onUpdateActionPriority(
                        action.id,
                        value as WorkspaceActionPriority,
                      )
                    }
                    className="rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {phase === "focus" ? (
        <div className="mt-4 space-y-2">
          <Input
            id="retro-action-title"
            label="Action item"
            value={actionTitle}
            onChange={(event) => onActionTitleChange(event.target.value)}
            placeholder="Add an action item"
            fullWidth
          />
          <div className="grid gap-1">
            <label htmlFor="retro-action-owner" className={fieldLabelClassName}>
              Action owner
            </label>
            <Select
              id="retro-action-owner"
              value={actionOwner}
              options={[
                { value: "", label: "Unassigned" },
                ...participantOptions,
              ]}
              onValueChange={onActionOwnerChange}
              className="rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input
              id="retro-action-due-date"
              label="Action due date"
              type="date"
              value={actionDueDate}
              onChange={(event) => onActionDueDateChange(event.target.value)}
              fullWidth
              className="rounded-xl px-3 py-2 text-sm"
            />
            <div className="grid gap-1">
              <label
                htmlFor="retro-action-priority"
                className={fieldLabelClassName}
              >
                Action priority
              </label>
              <Select
                id="retro-action-priority"
                value={actionPriority}
                options={actionPriorityOptions}
                onValueChange={(value) =>
                  onActionPriorityChange(value as WorkspaceActionPriority)
                }
                className="rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={onAddAction}
          >
            Add action
          </Button>
        </div>
      ) : null}
    </div>
  );
}
