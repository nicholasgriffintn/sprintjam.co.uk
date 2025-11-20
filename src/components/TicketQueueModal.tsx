import { FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, GripVertical } from 'lucide-react';

import type { TicketQueueItem } from '../types';
import { Modal } from './ui/Modal';

interface TicketQueueModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentTicket?: TicketQueueItem;
    queue: TicketQueueItem[];
    onAddTicket: (ticket: Partial<TicketQueueItem>) => void;
    onUpdateTicket: (ticketId: number, updates: Partial<TicketQueueItem>) => void;
    onDeleteTicket: (ticketId: number) => void;
    canManageQueue: boolean;
}

export const TicketQueueModal: FC<TicketQueueModalProps> = ({
    isOpen,
    onClose,
    currentTicket,
    queue,
    onAddTicket,
    onDeleteTicket,
    canManageQueue,
}) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTicketTitle, setNewTicketTitle] = useState('');
    const [newTicketDescription, setNewTicketDescription] = useState('');

    const completedTickets = queue.filter((t) => t.status === 'completed');
    const pendingTickets = queue.filter((t) => t.status === 'pending');

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

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    const getVoteSummary = (ticket: TicketQueueItem) => {
        if (!ticket.votes || ticket.votes.length === 0) return 'No votes';

        const voteValues = ticket.votes.map(v => String(v.vote));
        const counts: Record<string, number> = {};
        voteValues.forEach(v => counts[v] = (counts[v] || 0) + 1);

        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .map(([val, count]) => `${val} (${count})`)
            .join(', ');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Ticket Queue" size="lg">
            <div className="space-y-6">
                {currentTicket && (
                    <div className="rounded-lg border-2 border-blue-500 bg-blue-50 p-4 dark:border-blue-400 dark:bg-blue-900/20">
                        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                            Current Ticket
                        </h3>
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-lg font-bold">{currentTicket.ticketId}</span>
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
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                            Pending Tickets ({pendingTickets.length})
                        </h3>
                        {canManageQueue && (
                            <button
                                onClick={() => setShowAddForm(!showAddForm)}
                                className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                            >
                                <Plus className="h-3 w-3" />
                                Add Ticket
                            </button>
                        )}
                    </div>

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
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddTicket()}
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

                    <div className="space-y-2">
                        {pendingTickets.length === 0 ? (
                            <p className="py-4 text-center text-sm text-slate-500">No pending tickets</p>
                        ) : (
                            pendingTickets.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                                >
                                    {canManageQueue && (
                                        <GripVertical className="h-4 w-4 text-slate-400" />
                                    )}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm font-semibold">{ticket.ticketId}</span>
                                            {ticket.title && <span className="text-sm">{ticket.title}</span>}
                                        </div>
                                        {ticket.description && (
                                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                                                {ticket.description}
                                            </p>
                                        )}
                                    </div>
                                    {canManageQueue && (
                                        <button
                                            onClick={() => onDeleteTicket(ticket.id)}
                                            className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {completedTickets.length > 0 && (
                    <div>
                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                            Completed Tickets ({completedTickets.length})
                        </h3>
                        <div className="space-y-2">
                            {completedTickets.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm font-semibold">{ticket.ticketId}</span>
                                                {ticket.title && <span className="text-sm">{ticket.title}</span>}
                                                <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs font-semibold text-white">
                                                    Completed
                                                </span>
                                            </div>
                                            {ticket.description && (
                                                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                                                    {ticket.description}
                                                </p>
                                            )}
                                            <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                                                <div>Votes: {getVoteSummary(ticket)}</div>
                                                {ticket.outcome && <div>Outcome: {ticket.outcome}</div>}
                                                <div>Completed: {formatDate(ticket.completedAt!)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};
