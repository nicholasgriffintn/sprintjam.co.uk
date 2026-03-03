import { memo, useState, useCallback, useEffect, useRef } from "react";
import type { WheelEntry, SpinResult } from "@sprintjam/types";

import { ScrollArea } from "@/components/ui";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

interface WheelSidebarProps {
  entries: WheelEntry[];
  results: SpinResult[];
  isModeratorView: boolean;
  onBulkAddEntries: (names: string[]) => void;
  onClearEntries: () => void;
  disabled?: boolean;
}

type TabId = "entries" | "results";

const DEBOUNCE_MS = 500;
const getEnabledEntriesText = (entries: WheelEntry[]) =>
  entries
    .filter((e) => e.enabled)
    .map((e) => e.name)
    .join("\n");
const parseBulkNames = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

interface WheelEntriesPanelProps {
  entries: WheelEntry[];
  isModeratorView: boolean;
  onBulkAddEntries: (names: string[]) => void;
  onClearEntries: () => void;
  disabled?: boolean;
}

const WheelEntriesPanel = memo(function WheelEntriesPanel({
  entries,
  isModeratorView,
  onBulkAddEntries,
  onClearEntries,
  disabled,
}: WheelEntriesPanelProps) {
  const [bulkText, setBulkText] = useState(() =>
    getEnabledEntriesText(entries),
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bulkAddRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bulkTextRef = useRef(bulkText);
  const entriesTextRef = useRef(getEnabledEntriesText(entries));
  const pendingBulkTextRef = useRef<string | null>(null);
  const isTextareaFocusedRef = useRef(false);

  useEffect(() => {
    bulkTextRef.current = bulkText;
  }, [bulkText]);

  useEffect(() => {
    const nextEntriesText = getEnabledEntriesText(entries);
    entriesTextRef.current = nextEntriesText;

    if (pendingBulkTextRef.current === nextEntriesText) {
      pendingBulkTextRef.current = null;
      return;
    }

    const shouldPreserveLocalDraft =
      pendingBulkTextRef.current !== null ||
      (isTextareaFocusedRef.current && bulkTextRef.current !== nextEntriesText);

    if (shouldPreserveLocalDraft) {
      return;
    }

    setBulkText((currentBulkText) =>
      nextEntriesText === currentBulkText ? currentBulkText : nextEntriesText,
    );
  }, [entries]);

  useEffect(() => {
    if (disabled || !isModeratorView) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (bulkAddRef.current) {
        clearTimeout(bulkAddRef.current);
        bulkAddRef.current = null;
      }
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const names = parseBulkNames(bulkText);
      const nextBulkText = names.join("\n");
      const comparisonText =
        pendingBulkTextRef.current ?? entriesTextRef.current;

      if (nextBulkText !== comparisonText) {
        pendingBulkTextRef.current = nextBulkText;
        onClearEntries();
        if (names.length > 0) {
          bulkAddRef.current = setTimeout(() => {
            onBulkAddEntries(names);
            bulkAddRef.current = null;
          }, 50);
        }
      }

      debounceRef.current = null;
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (bulkAddRef.current) {
        clearTimeout(bulkAddRef.current);
        bulkAddRef.current = null;
      }
    };
  }, [bulkText, disabled, isModeratorView, onBulkAddEntries, onClearEntries]);

  const handleClear = useCallback(() => {
    setBulkText("");
    onClearEntries();
  }, [onClearEntries]);

  const enabledCount = entries.filter((e) => e.enabled).length;

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4">
      {isModeratorView ? (
        <>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            onFocus={() => {
              isTextareaFocusedRef.current = true;
            }}
            onBlur={() => {
              isTextareaFocusedRef.current = false;

              const nextEntriesText = entriesTextRef.current;
              if (pendingBulkTextRef.current !== null) {
                return;
              }

              setBulkText((currentBulkText) =>
                currentBulkText === nextEntriesText
                  ? currentBulkText
                  : nextEntriesText,
              );
            }}
            placeholder="Enter names, one per line..."
            className="flex-1 w-full rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-white placeholder-slate-400 resize-none min-h-[220px]"
            disabled={disabled}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {enabledCount} entr{enabledCount === 1 ? "y" : "ies"} on wheel
            </p>
            {entries.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                disabled={disabled}
                className="rounded-full border border-slate-200/70 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:text-slate-900 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear
              </button>
            )}
          </div>
        </>
      ) : (
        <ScrollArea
          className="flex-1 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          contentClassName="pr-3"
          aria-label="Wheel entries"
        >
          {entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Waiting for entries...
            </p>
          ) : (
            <ul className="space-y-1">
              {entries
                .filter((e) => e.enabled)
                .map((entry) => (
                  <li key={entry.id}>{entry.name}</li>
                ))}
            </ul>
          )}
        </ScrollArea>
      )}
    </div>
  );
});

function WheelResultsPanel({ results }: { results: SpinResult[] }) {
  return (
    <div className="flex flex-col min-h-0 gap-4">
      <ScrollArea
        className="min-h-[220px] max-h-[min(45vh,360px)] rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5"
        contentClassName="pr-3"
        aria-label="Wheel results"
      >
        {results.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No results yet. Spin the wheel!
          </p>
        ) : (
          <ul className="space-y-2">
            {[...results].reverse().map((result, index) => (
              <li
                key={result.id}
                className={`rounded-xl px-3 py-2 ${
                  index === 0
                    ? "bg-brand-900/40 border border-brand-700/70"
                    : "bg-white/80 dark:bg-slate-900/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-medium ${
                      index === 0
                        ? "text-brand-300"
                        : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {result.winner}
                  </span>
                  <span className="text-xs text-slate-400">
                    #{results.length - index}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Latest spin at the top</span>
        <span>{results.length} total</span>
      </div>
    </div>
  );
}

export function WheelSidebar({
  entries,
  results,
  isModeratorView,
  onBulkAddEntries,
  onClearEntries,
  disabled,
}: WheelSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabId>("entries");

  return (
    <SurfaceCard
      padding="sm"
      className="w-full flex-shrink-0 flex flex-col min-h-0 lg:w-[340px]"
    >
      <div className="flex flex-col gap-3 border-b border-slate-200/70 pb-3 dark:border-white/10">
        <div className="w-full">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Wheel control
          </p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Entries &amp; results
          </p>
        </div>
        <div className="flex w-full rounded-full bg-slate-100/80 p-1 dark:bg-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab("entries")}
            className={`flex-1 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
              activeTab === "entries"
                ? "rounded-full bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            Entries
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("results")}
            className={`flex-1 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
              activeTab === "results"
                ? "rounded-full bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            Results
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 pt-4">
        {activeTab === "entries" ? (
          <WheelEntriesPanel
            entries={entries}
            isModeratorView={isModeratorView}
            onBulkAddEntries={onBulkAddEntries}
            onClearEntries={onClearEntries}
            disabled={disabled}
          />
        ) : (
          <WheelResultsPanel results={results} />
        )}
      </div>
    </SurfaceCard>
  );
}
