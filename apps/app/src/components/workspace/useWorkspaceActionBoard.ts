import { useEffect, useMemo, useState } from "react";
import type {
  WorkspaceActionItem,
  WorkspaceActionsPage,
  WorkspaceActionSourceFilter,
  WorkspaceActionStatus,
  WorkspaceActionStatusFilter,
  WorkspaceProcessLoop,
} from "@sprintjam/types";

import { toast } from "@/components/ui";
import {
  createWorkspaceAction,
  listWorkspaceActionsPage,
  updateWorkspaceAction,
} from "@/lib/workspace-service";

import { defaultWorkspaceActionCounts } from "./workspace-action-board-model";

interface UseWorkspaceActionBoardParams {
  teamSlug: string;
  actionsPage: WorkspaceActionsPage | null;
  processLoops: WorkspaceProcessLoop[];
}

export function useWorkspaceActionBoard({
  teamSlug,
  actionsPage,
  processLoops,
}: UseWorkspaceActionBoardParams) {
  const [statusFilter, setStatusFilter] =
    useState<WorkspaceActionStatusFilter>("all");
  const [sourceFilter, setSourceFilter] =
    useState<WorkspaceActionSourceFilter>("all");
  const [selectedLoopId, setSelectedLoopId] = useState<number | null>(null);
  const [actions, setActions] = useState(actionsPage?.actions ?? []);
  const [counts, setCounts] = useState(
    actionsPage?.counts ?? defaultWorkspaceActionCounts,
  );
  const [loops, setLoops] = useState(processLoops);
  const [newActionTitle, setNewActionTitle] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreatingAction, setIsCreatingAction] = useState(false);
  const [updatingActionId, setUpdatingActionId] = useState<number | null>(null);

  useEffect(() => {
    setStatusFilter("all");
    setSourceFilter("all");
    setSelectedLoopId(null);
    setActions(actionsPage?.actions ?? []);
    setCounts(actionsPage?.counts ?? defaultWorkspaceActionCounts);
    setLoops(processLoops);
  }, [teamSlug, actionsPage, processLoops]);

  const activeLoops = useMemo(
    () => loops.filter((loop) => loop.status !== "completed"),
    [loops],
  );

  const refreshActions = async (
    nextStatus = statusFilter,
    nextSource = sourceFilter,
    nextLoopId = selectedLoopId,
  ) => {
    setIsRefreshing(true);
    try {
      const page = await listWorkspaceActionsPage(teamSlug, {
        status: nextStatus,
        source: nextSource,
        processLoopId: nextLoopId ?? undefined,
      });
      setActions(page.actions);
      setCounts(page.counts);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load actions",
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStatusChange = (value: string) => {
    const next = value as WorkspaceActionStatusFilter;
    setStatusFilter(next);
    void refreshActions(next, sourceFilter, selectedLoopId);
  };

  const handleSourceChange = (value: string) => {
    const next = value as WorkspaceActionSourceFilter;
    setSourceFilter(next);
    void refreshActions(statusFilter, next, selectedLoopId);
  };

  const handleLoopChange = (value: string) => {
    const next = value === "all" ? null : Number.parseInt(value, 10);
    setSelectedLoopId(next);
    void refreshActions(statusFilter, sourceFilter, next);
  };

  const handleCreateAction = async () => {
    const title = newActionTitle.trim();
    if (!title) return;

    setIsCreatingAction(true);
    try {
      const action = await createWorkspaceAction(teamSlug, {
        title,
        source: "manual",
        processLoopId: selectedLoopId,
      });
      setActions((current) => [action, ...current]);
      setCounts((current) => ({
        ...current,
        all: current.all + 1,
        open: current.open + 1,
      }));
      setNewActionTitle("");
      toast.success("Action added");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to create action",
      );
    } finally {
      setIsCreatingAction(false);
    }
  };

  const handleUpdateActionStatus = async (
    action: WorkspaceActionItem,
    status: WorkspaceActionStatus,
  ) => {
    setUpdatingActionId(action.id);
    try {
      const updated = await updateWorkspaceAction(teamSlug, action.id, {
        status,
      });
      setActions((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      await refreshActions();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update action",
      );
    } finally {
      setUpdatingActionId(null);
    }
  };

  return {
    actions,
    activeLoops,
    counts,
    filters: {
      selectedLoopId,
      sourceFilter,
      statusFilter,
    },
    form: {
      newActionTitle,
      setNewActionTitle,
    },
    handlers: {
      createAction: handleCreateAction,
      refreshActions,
      setLoopFilter: handleLoopChange,
      setSourceFilter: handleSourceChange,
      setStatusFilter: handleStatusChange,
      updateActionStatus: handleUpdateActionStatus,
    },
    pending: {
      isCreatingAction,
      isRefreshing,
      updatingActionId,
    },
  };
}
