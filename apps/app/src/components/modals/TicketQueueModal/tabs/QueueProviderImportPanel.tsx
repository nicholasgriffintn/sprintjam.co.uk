import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import type { QueueProviderImportState } from "./useQueueProviderImport";

interface QueueProviderImportPanelProps {
  importState: QueueProviderImportState;
}

export function QueueProviderImportPanel({
  importState,
}: QueueProviderImportPanelProps) {
  const {
    showProviderImport,
    activeProvider,
    canManageQueue,
    canManageExternal,
    externalLabels,
    providerName,
    selectedBoardId,
    selectedSprintId,
    ticketSearch,
    boardOptions,
    sprintOptions,
    boardsLoading,
    ticketsLoading,
    ticketsFetching,
    boardsError,
    sprintsError,
    ticketsError,
    visibleExternalTickets,
    selectedTicketIds,
    hasLoadedTickets,
    selectedCount,
    isTicketEstimated,
    setSelectedBoardId,
    setSelectedSprintId,
    setTicketSearch,
    toggleTicketSelection,
    selectAllTickets,
    deselectAllTickets,
    selectUnestimatedTickets,
    importSelectedTickets,
    resetProviderImport,
  } = importState;

  return (
    <AnimatePresence>
      {showProviderImport && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-3 overflow-hidden"
        >
          <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-sm shadow-sm dark:border-slate-800/80 dark:bg-slate-900/70">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                  Import from {providerName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select a {externalLabels.board.toLowerCase()} to load
                  tickets, then choose which ones to add to the queue.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(boardsLoading || ticketsFetching) && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading
                  </div>
                )}
                <Button
                  onClick={resetProviderImport}
                  variant="unstyled"
                  className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100"
                >
                  Cancel
                </Button>
              </div>
            </div>

            {!canManageQueue && (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Only moderators can import tickets from {providerName}.
              </p>
            )}

            {canManageExternal && (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    {externalLabels.board}
                    <Select
                      value={selectedBoardId}
                      onValueChange={setSelectedBoardId}
                      disabled={boardsLoading}
                      data-testid="queue-import-board"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      options={boardOptions}
                    />
                  </label>

                  {externalLabels.supportsSprint && (
                    <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                      {externalLabels.sprint}
                      <Select
                        value={selectedSprintId}
                        onValueChange={setSelectedSprintId}
                        disabled={!selectedBoardId}
                        data-testid="queue-import-sprint"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        options={sprintOptions}
                      />
                    </label>
                  )}
                </div>

                {boardsError && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                    {boardsError}
                  </p>
                )}
                {sprintsError && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                    {sprintsError}
                  </p>
                )}
                {ticketsError && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                    {ticketsError}
                  </p>
                )}

                {!selectedBoardId && (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    A {externalLabels.board.toLowerCase()} must be selected
                    before loading tickets.
                  </p>
                )}

                {selectedBoardId && (
                  <>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        placeholder="Search tickets..."
                        value={ticketSearch}
                        onChange={(e) => setTicketSearch(e.target.value)}
                        data-testid="queue-import-search"
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      />
                      <Button
                        onClick={selectAllTickets}
                        disabled={!hasLoadedTickets}
                        variant="unstyled"
                        className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-200 disabled:opacity-60 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                      >
                        Select all
                      </Button>
                      <Button
                        onClick={deselectAllTickets}
                        disabled={!hasLoadedTickets}
                        variant="unstyled"
                        className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-200 disabled:opacity-60 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                      >
                        Deselect all
                      </Button>
                      <Button
                        onClick={selectUnestimatedTickets}
                        disabled={!hasLoadedTickets}
                        variant="unstyled"
                        className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 shadow-sm hover:bg-blue-100 disabled:opacity-60 dark:bg-blue-900/40 dark:text-blue-200 dark:hover:bg-blue-900/60"
                      >
                        Select unestimated
                      </Button>
                    </div>

                    <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                      {ticketsLoading ? (
                        <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading tickets...
                        </div>
                      ) : visibleExternalTickets.length === 0 ? (
                        <p className="py-4 text-center text-sm text-slate-500">
                          No tickets found for this selection.
                        </p>
                      ) : (
                        visibleExternalTickets.map((ticket) => {
                          const isSelected = selectedTicketIds.has(ticket.id);
                          const estimated = isTicketEstimated(ticket);

                          return (
                            <label
                              key={ticket.id}
                              className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
                                isSelected
                                  ? "border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/30"
                                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-slate-600"
                              } `}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleTicketSelection(ticket.id)}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                                    {ticket.key}
                                  </span>
                                  {ticket.status && (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                                      {ticket.status}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                  {ticket.title}
                                </p>
                                {ticket.description && (
                                  <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400 break-all">
                                    {ticket.description}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                                  {ticket.assignee && (
                                    <span>Assignee: {ticket.assignee}</span>
                                  )}
                                  {activeProvider === "github" ? (
                                    <span>
                                      Points label: {estimated ? "Set" : "Not set"}
                                    </span>
                                  ) : (
                                    <span>
                                      Story Points:{" "}
                                      {ticket.storyPoints !== null &&
                                      ticket.storyPoints !== undefined
                                        ? ticket.storyPoints
                                        : "Not set"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>

                    <div className="mt-3 flex justify-end">
                      <Button
                        onClick={importSelectedTickets}
                        disabled={selectedCount === 0}
                        data-testid="queue-import-confirm"
                        variant="unstyled"
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                      >
                        Import selected ({selectedCount})
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
