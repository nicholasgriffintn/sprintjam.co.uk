import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GripVertical, Link2, Plus, Loader2, Trash2 } from 'lucide-react';

import type { TicketQueueItem, TicketMetadata } from '../../../types';
import { fetchJiraTicket } from '../../../lib/jira-service';
import { handleError } from '../../../utils/error';
import { getJiraMetadata } from '../../../utils/jira';
import { getLinearMetadata } from '../../../utils/linear';
import { JiraBadge } from '../../JiraBadge';
import { LinearBadge } from '../../LinearBadge';

interface TicketQueueModalQueueTabProps {
  currentTicket?: TicketQueueItem;
  externalService: 'none' | 'jira' | 'linear';
  onAddTicket: (ticket: Partial<TicketQueueItem>) => void;
  onUpdateTicket: (ticketId: number, updates: Partial<TicketQueueItem>) => void;
  onDeleteTicket: (ticketId: number) => void;
  roomKey: string;
  userName: string;
  canManageQueue: boolean;
  pendingTickets: TicketQueueItem[];
  onError?: (message: string) => void;
}

export function TicketQueueModalQueueTab({
  currentTicket,
  externalService,
  onAddTicket,
  onUpdateTicket,
  onDeleteTicket,
  roomKey,
  userName,
  canManageQueue,
  pendingTickets,
  onError,
}: TicketQueueModalQueueTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showJiraForm, setShowJiraForm] = useState(false);
  const [newTicketTitle, setNewTicketTitle] = useState('');
  const [newTicketDescription, setNewTicketDescription] = useState('');

  const [jiraLookupKey, setJiraLookupKey] = useState('');
  const [jiraPreview, setJiraPreview] = useState<TicketMetadata | null>(null);
  const [isFetchingJira, setIsFetchingJira] = useState(false);
  const [isSavingJiraAdd, setIsSavingJiraAdd] = useState(false);

  const [linkingTicketId, setLinkingTicketId] = useState<number | null>(null);
  const [linkLookupKey, setLinkLookupKey] = useState('');
  const [linkPreview, setLinkPreview] = useState<TicketMetadata | null>(null);
  const [isFetchingLink, setIsFetchingLink] = useState(false);
  const [isSavingLink, setIsSavingLink] = useState(false);

  const jiraEnabled = externalService === 'jira';
  const linearEnabled = externalService === 'linear';

  const renderBadge = (ticket?: TicketQueueItem) => {
    if (!ticket) return null;
    if (ticket.externalService === 'jira') return <JiraBadge {...ticket} />;
    if (ticket.externalService === 'linear') return <LinearBadge {...ticket} />;
    return null;
  };

  const handleAddTicket = () => {
    if (!newTicketTitle.trim()) return;

    onAddTicket({
      title: newTicketTitle.trim(),
      description: newTicketDescription.trim() || undefined,
      status: 'pending',
    });

    setNewTicketTitle('');
    setNewTicketDescription('');
    setShowAddForm(false);
  };

  const lookupJiraTicket = async (
    key: string,
    setPreview: (ticket: TicketMetadata | null) => void,
    setLoading: (loading: boolean) => void
  ) => {
    if (!key.trim()) return;
    setLoading(true);
    try {
      const ticket = await fetchJiraTicket(key.trim(), { roomKey, userName });
      setPreview(ticket);
    } catch (err) {
      handleError(
        err instanceof Error ? err.message : 'Failed to fetch Jira ticket',
        onError
      );
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFromJira = async () => {
    if (!jiraPreview) {
      handleError(
        'Fetch a Jira ticket before adding it to the queue.',
        onError
      );
      return;
    }

    setIsSavingJiraAdd(true);
    try {
      onAddTicket({
        ticketId: jiraPreview.key,
        title: jiraPreview.summary,
        description: jiraPreview.description || undefined,
        status: 'pending',
        externalService: 'jira',
        externalServiceId: jiraPreview.id,
        externalServiceMetadata: jiraPreview,
      });

      setJiraLookupKey('');
      setJiraPreview(null);
      setShowJiraForm(false);
    } catch (err) {
      handleError(
        err instanceof Error ? err.message : 'Failed to add Jira ticket',
        onError
      );
    } finally {
      setIsSavingJiraAdd(false);
    }
  };

  const startLinkTicket = (ticket: TicketQueueItem) => {
    setLinkingTicketId(ticket.id);
    const metadata = getJiraMetadata(ticket);
    setLinkPreview(metadata ?? null);
    setLinkLookupKey(metadata?.key || ticket.ticketId || '');
  };

  const cancelLinking = () => {
    setLinkingTicketId(null);
    setLinkLookupKey('');
    setLinkPreview(null);
  };

  const handleApplyJiraLink = async () => {
    if (!linkingTicketId || !linkPreview) {
      handleError('Fetch a Jira ticket before linking.', onError);
      return;
    }

    setIsSavingLink(true);
    try {
      onUpdateTicket(linkingTicketId, {
        ticketId: linkPreview.key,
        title: linkPreview.summary,
        description: linkPreview.description || undefined,
        externalService: 'jira',
        externalServiceId: linkPreview.id,
        externalServiceMetadata: linkPreview,
      });
      cancelLinking();
    } catch (err) {
      handleError(
        err instanceof Error ? err.message : 'Failed to link Jira ticket',
        onError
      );
    } finally {
      setIsSavingLink(false);
    }
  };

  const renderJiraPreview = (ticket: TicketMetadata | null) => {
    if (!ticket) return null;
    return (
      <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-600 px-2 py-0.5 font-semibold text-white">
              {ticket.key}
            </span>
            <span className="font-semibold text-slate-800 dark:text-white">
              {ticket.summary}
            </span>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-200">
            {ticket.status || 'Unknown'}
          </span>
        </div>
        {ticket.description && (
          <p className="mt-2 line-clamp-2 text-slate-600 dark:text-slate-300">
            {ticket.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300">
          {ticket.assignee && <span>Assignee: {ticket.assignee}</span>}
          <span>
            Story Points:{' '}
            {ticket.storyPoints !== null && ticket.storyPoints !== undefined
              ? ticket.storyPoints
              : 'Not set'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      {currentTicket && (
        <div className="rounded-lg border-2 border-blue-500 bg-blue-50 p-4 dark:border-blue-400 dark:bg-blue-900/20">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
            <span>Current Ticket</span>
            {renderBadge(currentTicket)}
          </h3>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-lg font-bold">
                {currentTicket.ticketId}
              </span>
              <span className="rounded-full bg-blue-500 px-2 py-1 text-xs font-semibold text-white">
                In Progress
              </span>
            </div>
            {currentTicket.title && (
              <p className="text-sm font-medium">{currentTicket.title}</p>
            )}
            {currentTicket.description && (
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {currentTicket.description}
              </p>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
            Pending Tickets ({pendingTickets.length})
          </h3>
          {canManageQueue && (
            <div className="flex flex-wrap items-center gap-2">
              {jiraEnabled && (
                <button
                  onClick={() => {
                    setShowJiraForm(!showJiraForm);
                    setJiraPreview(null);
                  }}
                  data-testid="queue-add-jira-button"
                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  <Link2 className="h-3 w-3" />
                  Add Jira Ticket
                </button>
              )}
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                data-testid="queue-toggle-add"
                className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
              >
                <Plus className="h-3 w-3" />
                Add Ticket
              </button>
            </div>
          )}
        </div>

        {linearEnabled && (
          <p className="mb-3 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-800 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-100">
            Linear integration connected. Ticket import is coming soon—add
            tickets manually for now.
          </p>
        )}

        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 overflow-hidden"
            >
              <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <input
                  type="text"
                  placeholder="Ticket title"
                  value={newTicketTitle}
                  onChange={(e) => setNewTicketTitle(e.target.value)}
                  className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTicket()}
                />
                <textarea
                  placeholder="Description (optional)"
                  value={newTicketDescription}
                  onChange={(e) => setNewTicketDescription(e.target.value)}
                  className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddTicket}
                    disabled={!newTicketTitle.trim()}
                    data-testid="queue-add-confirm"
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewTicketTitle('');
                      setNewTicketDescription('');
                    }}
                    className="rounded-lg bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-400 dark:bg-slate-600 dark:text-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showJiraForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 overflow-hidden"
            >
              <div className="rounded-lg border-2 border-dashed border-blue-200 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-900/20">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-blue-800 dark:text-blue-200">
                  Jira Ticket Key
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    placeholder="PROJECT-123"
                    value={jiraLookupKey}
                    onChange={(e) => setJiraLookupKey(e.target.value)}
                    data-testid="queue-jira-input"
                    className="flex-1 rounded-lg border border-blue-200 px-3 py-2 text-sm dark:border-blue-700 dark:bg-blue-900/30"
                  />
                  <button
                    onClick={() =>
                      lookupJiraTicket(
                        jiraLookupKey,
                        setJiraPreview,
                        setIsFetchingJira
                      )
                    }
                    disabled={isFetchingJira || !jiraLookupKey.trim()}
                    data-testid="queue-jira-fetch"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isFetchingJira && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Fetch
                  </button>
                </div>
                {renderJiraPreview(jiraPreview)}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleAddFromJira}
                    disabled={!jiraPreview || isSavingJiraAdd}
                    data-testid="queue-jira-add"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    {isSavingJiraAdd && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Add to Queue
                  </button>
                  <button
                    onClick={() => {
                      setShowJiraForm(false);
                      setJiraLookupKey('');
                      setJiraPreview(null);
                    }}
                    className="rounded-lg bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-400 dark:bg-slate-600 dark:text-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {pendingTickets.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">
              No pending tickets
            </p>
          ) : (
            pendingTickets.map((ticket) => {
              const jiraMetadata = getJiraMetadata(ticket);
              const linearMetadata = getLinearMetadata(ticket);
              const isLinking = linkingTicketId === ticket.id;

              return (
                <div
                  key={ticket.id}
                  className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-start gap-2">
                    {canManageQueue && (
                      <GripVertical className="h-4 w-4 text-slate-400" />
                    )}
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold">
                          {ticket.ticketId}
                        </span>
                        {renderBadge(ticket)}
                        {ticket.title && (
                          <span className="text-sm">{ticket.title}</span>
                        )}
                      </div>
                      {ticket.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {ticket.description}
                        </p>
                      )}
                      {jiraMetadata && (
                        <p className="text-xs text-blue-700 dark:text-blue-200">
                          {jiraMetadata.summary}
                        </p>
                      )}
                      {linearMetadata && (
                        <p className="text-xs text-purple-700 dark:text-purple-200">
                          {linearMetadata.title || linearMetadata.identifier}
                        </p>
                      )}
                    </div>
                    {canManageQueue && (
                      <div className="flex items-center gap-1">
                        {jiraEnabled && (
                          <button
                            onClick={() =>
                              isLinking
                                ? cancelLinking()
                                : startLinkTicket(ticket)
                            }
                            data-testid={`queue-link-toggle-${ticket.id}`}
                            className="rounded-lg px-2 py-1 text-blue-700 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-900/40"
                          >
                            {isLinking ? 'Close' : 'Link Jira'}
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteTicket(ticket.id)}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <AnimatePresence>
                    {isLinking && jiraEnabled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 overflow-hidden rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-900/20"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            type="text"
                            value={linkLookupKey}
                            onChange={(e) => setLinkLookupKey(e.target.value)}
                            placeholder="PROJECT-123"
                            data-testid={`queue-link-jira-input-${ticket.id}`}
                            className="flex-1 rounded-lg border border-blue-200 px-3 py-2 text-sm dark:border-blue-700 dark:bg-blue-900/30"
                          />
                          <button
                            onClick={() =>
                              lookupJiraTicket(
                                linkLookupKey,
                                setLinkPreview,
                                setIsFetchingLink
                              )
                            }
                            disabled={isFetchingLink || !linkLookupKey.trim()}
                            data-testid={`queue-link-jira-fetch-${ticket.id}`}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {isFetchingLink && (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            Fetch
                          </button>
                        </div>
                        {renderJiraPreview(linkPreview)}
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={handleApplyJiraLink}
                            disabled={!linkPreview || isSavingLink}
                            data-testid={`queue-link-jira-save-${ticket.id}`}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                          >
                            {isSavingLink && (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            Save Link
                          </button>
                          <button
                            onClick={cancelLinking}
                            className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
