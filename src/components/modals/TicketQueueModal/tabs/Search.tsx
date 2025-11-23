import { useState, useEffect } from 'react';
import { useMutation } from "@tanstack/react-query";
import { Search as SearchIcon, Loader2, Plus } from 'lucide-react';

import type { TicketQueueItem, TicketMetadata } from '@/types';
import {
  searchJiraTickets,
  getJiraProjects,
  importJiraTicketsBatch,
  type JiraProject,
} from '@/lib/jira-service';
import {
  searchLinearIssues,
  getLinearTeams,
  importLinearIssuesBatch,
  type LinearTeam,
} from '@/lib/linear-service';
import { handleError } from '@/utils/error';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface TicketQueueModalSearchTabProps {
  externalService: 'none' | 'jira' | 'linear';
  onAddTicket: (ticket: Partial<TicketQueueItem>) => void;
  roomKey: string;
  userName: string;
  canManageQueue: boolean;
  onError?: (message: string) => void;
}

export function TicketQueueModalSearchTab({
  externalService,
  onAddTicket,
  roomKey,
  userName,
  canManageQueue,
  onError,
}: TicketQueueModalSearchTabProps) {
  const [searchText, setSearchText] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchResults, setSearchResults] = useState<TicketMetadata[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [teams, setTeams] = useState<LinearTeam[]>([]);

  const jiraEnabled = externalService === 'jira';
  const linearEnabled = externalService === 'linear';

  // Fetch projects/teams on mount
  useEffect(() => {
    if (jiraEnabled) {
      getJiraProjects(roomKey, userName)
        .then(setProjects)
        .catch((err) => handleError(err instanceof Error ? err.message : 'Failed to fetch projects', onError));
    } else if (linearEnabled) {
      getLinearTeams(roomKey, userName)
        .then(setTeams)
        .catch((err) => handleError(err instanceof Error ? err.message : 'Failed to fetch teams', onError));
    }
  }, [jiraEnabled, linearEnabled, roomKey, userName, onError]);

  const searchMutation = useMutation({
    mutationKey: ["search-tickets", roomKey, userName],
    mutationFn: async () => {
      if (jiraEnabled) {
        const result = await searchJiraTickets({
          roomKey,
          userName,
          text: searchText || undefined,
          project: selectedProject || undefined,
          status: selectedStatus || undefined,
          maxResults: 50,
        });
        return result.tickets;
      } else if (linearEnabled) {
        const result = await searchLinearIssues({
          roomKey,
          userName,
          query: searchText || undefined,
          teamId: selectedTeam || undefined,
          first: 50,
        });
        return result.tickets;
      }
      return [];
    },
    onSuccess: (tickets) => {
      setSearchResults(tickets);
      setSelectedTickets(new Set());
    },
    onError: (err) => {
      handleError(
        err instanceof Error ? err.message : 'Failed to search tickets',
        onError
      );
    },
  });

  const importMutation = useMutation({
    mutationKey: ["import-batch", roomKey, userName],
    mutationFn: async () => {
      const ticketIds = Array.from(selectedTickets);
      if (ticketIds.length === 0) {
        throw new Error('No tickets selected');
      }

      if (jiraEnabled) {
        return await importJiraTicketsBatch(ticketIds, { roomKey, userName });
      } else if (linearEnabled) {
        return await importLinearIssuesBatch(ticketIds, { roomKey, userName });
      }
      return [];
    },
    onSuccess: (tickets) => {
      tickets.forEach((ticket) => {
        onAddTicket({
          ticketId: ticket.key,
          title: ticket.summary,
          description: ticket.description || undefined,
          status: 'pending',
          externalService: externalService === 'jira' ? 'jira' : 'linear',
          externalServiceId: ticket.id,
          externalServiceMetadata: ticket,
        });
      });
      setSelectedTickets(new Set());
      setSearchResults([]);
      setSearchText('');
      setSelectedProject('');
      setSelectedTeam('');
      setSelectedStatus('');
    },
    onError: (err) => {
      handleError(
        err instanceof Error ? err.message : 'Failed to import tickets',
        onError
      );
    },
  });

  const handleSearch = () => {
    searchMutation.mutate();
  };

  const handleToggleTicket = (ticketId: string) => {
    const newSelected = new Set(selectedTickets);
    if (newSelected.has(ticketId)) {
      newSelected.delete(ticketId);
    } else {
      newSelected.add(ticketId);
    }
    setSelectedTickets(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTickets.size === searchResults.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(searchResults.map(t => t.key)));
    }
  };

  const handleImportSelected = () => {
    importMutation.mutate();
  };

  if (!jiraEnabled && !linearEnabled) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Search is only available when Jira or Linear integration is enabled.</p>
        <p className="text-sm mt-2">Configure your integration in Settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Form */}
      <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder={`Search ${jiraEnabled ? 'Jira tickets' : 'Linear issues'}...`}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {jiraEnabled && (
            <>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="px-3 py-2 border rounded-md bg-white dark:bg-gray-900"
              >
                <option value="">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.key}>
                    {project.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border rounded-md bg-white dark:bg-gray-900"
              >
                <option value="">All Statuses</option>
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            </>
          )}

          {linearEnabled && (
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="px-3 py-2 border rounded-md bg-white dark:bg-gray-900"
            >
              <option value="">All Teams</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <Button
          onClick={handleSearch}
          disabled={searchMutation.isPending}
          className="w-full"
        >
          {searchMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <SearchIcon className="w-4 h-4 mr-2" />
              Search
            </>
          )}
        </Button>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedTickets.size === searchResults.length && searchResults.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedTickets.size > 0
                  ? `${selectedTickets.size} selected`
                  : `${searchResults.length} results`}
              </span>
            </div>

            {selectedTickets.size > 0 && canManageQueue && (
              <Button
                onClick={handleImportSelected}
                disabled={importMutation.isPending}
                size="sm"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Import {selectedTickets.size} to Queue
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {searchResults.map((ticket) => (
              <label
                key={ticket.key}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedTickets.has(ticket.key)}
                  onChange={() => handleToggleTicket(ticket.key)}
                  className="mt-1 w-4 h-4"
                  disabled={!canManageQueue}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                      {ticket.key}
                    </span>
                    {ticket.status && (
                      <span className="px-2 py-0.5 text-xs rounded bg-gray-200 dark:bg-gray-700">
                        {ticket.status}
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-sm mt-1">{ticket.summary}</p>
                  {ticket.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {ticket.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    {ticket.assignee && <span>Assignee: {ticket.assignee}</span>}
                    {ticket.storyPoints !== null && ticket.storyPoints !== undefined && (
                      <span>Points: {ticket.storyPoints}</span>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {searchMutation.isSuccess && searchResults.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No tickets found matching your search criteria.</p>
          <p className="text-sm mt-2">Try adjusting your filters or search term.</p>
        </div>
      )}
    </div>
  );
}
