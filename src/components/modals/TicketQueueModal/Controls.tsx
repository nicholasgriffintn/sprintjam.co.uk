import { ArrowDownToLine } from 'lucide-react';

import type { TicketQueueItem } from '@/types';
import { downloadCsv } from '@/utils/csv';
import { buildCsv } from '@/components/modals/TicketQueueModal/utils/csv';

export function TicketQueueModalControls({
  activeTab,
  setActiveTab,
  completedTickets,
  externalService,
}: {
  activeTab: 'queue' | 'search' | 'history';
  setActiveTab: (tab: 'queue' | 'search' | 'history') => void;
  completedTickets: TicketQueueItem[];
  externalService: 'none' | 'jira' | 'linear';
}) {
  const handleDownloadHistory = () => {
    const csv = buildCsv(completedTickets);
    downloadCsv('sprintjam-past-estimations.csv', csv);
  };

  const showSearchTab = externalService === 'jira' || externalService === 'linear';

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs font-semibold dark:bg-slate-800/60">
        <button
          type="button"
          data-testid="queue-tab-queue"
          className={`rounded-full px-3 py-1.5 transition ${activeTab === 'queue'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
              : 'text-slate-500 dark:text-slate-300'
            }`}
          onClick={() => setActiveTab('queue')}
        >
          Queue
        </button>
        {showSearchTab && (
          <button
            type="button"
            data-testid="queue-tab-search"
            className={`rounded-full px-3 py-1.5 transition ${activeTab === 'search'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 dark:text-slate-300'
              }`}
            onClick={() => setActiveTab('search')}
          >
            Search & Import
          </button>
        )}
        <button
          type="button"
          data-testid="queue-tab-history"
          className={`rounded-full px-3 py-1.5 transition ${activeTab === 'history'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
              : 'text-slate-500 dark:text-slate-300'
            }`}
          onClick={() => setActiveTab('history')}
        >
          Past estimations
        </button>
      </div>
      {activeTab === 'history' && completedTickets.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadHistory}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 dark:bg-slate-200 dark:text-slate-900"
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
            Download CSV
          </button>
        </div>
      )}
    </div>
  );
}
