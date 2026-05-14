import type {
  WorkspaceActionItem,
  WorkspaceActionSourceFilter,
  WorkspaceActionStatus,
  WorkspaceActionStatusFilter,
  WorkspaceActionsPage,
} from "@sprintjam/types";

export const defaultWorkspaceActionCounts: WorkspaceActionsPage["counts"] = {
  all: 0,
  open: 0,
  in_progress: 0,
  resolved: 0,
  dismissed: 0,
};

export const statusOptions: Array<{
  label: string;
  value: WorkspaceActionStatusFilter;
}> = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "In progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
  { label: "Dismissed", value: "dismissed" },
];

export const sourceOptions: Array<{
  label: string;
  value: WorkspaceActionSourceFilter;
}> = [
  { label: "All sources", value: "all" },
  { label: "Planning", value: "planning" },
  { label: "Standups", value: "standup" },
  { label: "Wheels", value: "wheel" },
  { label: "Retros", value: "retro" },
  { label: "Manual", value: "manual" },
];

export function formatActionSource(source: WorkspaceActionItem["source"]) {
  return source === "standup"
    ? "Standup"
    : source === "wheel"
      ? "Wheel"
      : source === "retro"
        ? "Retro"
        : source === "planning"
          ? "Planning"
          : "Manual";
}

export function formatActionStatus(status: WorkspaceActionStatus) {
  return status === "in_progress"
    ? "In progress"
    : status === "resolved"
      ? "Resolved"
      : status === "dismissed"
        ? "Dismissed"
        : "Open";
}

export function getStatusVariant(status: WorkspaceActionStatus) {
  if (status === "resolved") return "success" as const;
  if (status === "dismissed") return "default" as const;
  if (status === "in_progress") return "warning" as const;
  return "info" as const;
}

export function getActionAge(timestamp: number) {
  const days = Math.floor((Date.now() - timestamp) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}
