import { useState, useCallback } from "react";
import type { WheelEntry } from "@sprintjam/types";

import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

interface WheelEntryListProps {
  entries: WheelEntry[];
  isModeratorView: boolean;
  onAddEntry: (name: string) => void;
  onRemoveEntry: (entryId: string) => void;
  onToggleEntry: (entryId: string, enabled: boolean) => void;
  onBulkAddEntries: (names: string[]) => void;
  onClearEntries: () => void;
  disabled?: boolean;
}

export function WheelEntryList({
  entries,
  isModeratorView,
  onAddEntry,
  onRemoveEntry,
  onToggleEntry,
  onBulkAddEntries,
  onClearEntries,
  disabled,
}: WheelEntryListProps) {
  const [newEntry, setNewEntry] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const handleAddEntry = useCallback(() => {
    const trimmed = newEntry.trim();
    if (trimmed) {
      onAddEntry(trimmed);
      setNewEntry("");
    }
  }, [newEntry, onAddEntry]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleAddEntry();
      }
    },
    [handleAddEntry],
  );

  const handleBulkAdd = useCallback(() => {
    const names = bulkText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (names.length > 0) {
      onBulkAddEntries(names);
      setBulkText("");
      setBulkMode(false);
    }
  }, [bulkText, onBulkAddEntries]);

  const enabledCount = entries.filter((e) => e.enabled).length;

  return (
    <SurfaceCard className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
          Entries
          <span className="ml-2 text-sm font-normal text-slate-500">
            ({enabledCount} active)
          </span>
        </h3>
        {isModeratorView && entries.length > 0 && (
          <Button
            variant="secondary"
            onClick={onClearEntries}
            disabled={disabled}
            className="text-xs"
          >
            Clear all
          </Button>
        )}
      </div>

      {isModeratorView && (
        <div className="mb-4">
          {bulkMode ? (
            <div className="space-y-2">
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Enter names, one per line..."
                className="w-full h-32 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                disabled={disabled}
              />
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={handleBulkAdd}
                  disabled={disabled || !bulkText.trim()}
                  className="flex-1"
                >
                  Add all
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setBulkMode(false);
                    setBulkText("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={newEntry}
                onChange={(e) => setNewEntry(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add an entry..."
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                disabled={disabled}
              />
              <Button
                variant="primary"
                onClick={handleAddEntry}
                disabled={disabled || !newEntry.trim()}
              >
                Add
              </Button>
              <Button
                variant="secondary"
                onClick={() => setBulkMode(true)}
                disabled={disabled}
                title="Add multiple entries"
              >
                Bulk
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">
            {isModeratorView
              ? "No entries yet. Add some names above!"
              : "Waiting for entries..."}
          </p>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                entry.enabled
                  ? "bg-slate-100 dark:bg-slate-800"
                  : "bg-slate-50 dark:bg-slate-900 opacity-50"
              }`}
            >
              {isModeratorView && (
                <input
                  type="checkbox"
                  checked={entry.enabled}
                  onChange={(e) => onToggleEntry(entry.id, e.target.checked)}
                  disabled={disabled}
                  className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              )}
              <span
                className={`flex-1 text-sm ${
                  entry.enabled
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-500 line-through"
                }`}
              >
                {entry.name}
              </span>
              {isModeratorView && (
                <button
                  onClick={() => onRemoveEntry(entry.id)}
                  disabled={disabled}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  title="Remove entry"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </SurfaceCard>
  );
}
