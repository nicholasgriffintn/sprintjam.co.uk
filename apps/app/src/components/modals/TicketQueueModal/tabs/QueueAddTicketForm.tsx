import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/Button";

interface QueueAddTicketFormProps {
  open: boolean;
  ticketTitle: string;
  ticketDescription: string;
  onTicketTitleChange: (value: string) => void;
  onTicketDescriptionChange: (value: string) => void;
  onCancel: () => void;
  onAdd: () => void;
}

export function QueueAddTicketForm({
  open,
  ticketTitle,
  ticketDescription,
  onTicketTitleChange,
  onTicketDescriptionChange,
  onCancel,
  onAdd,
}: QueueAddTicketFormProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-3 overflow-hidden"
        >
          <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-sm shadow-sm dark:border-slate-800/80 dark:bg-slate-900/70">
            <input
              type="text"
              placeholder="Ticket title"
              value={ticketTitle}
              onChange={(e) => onTicketTitleChange(e.target.value)}
              className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              onKeyDown={(e) => e.key === "Enter" && onAdd()}
            />
            <textarea
              placeholder="Description (optional)"
              value={ticketDescription}
              onChange={(e) => onTicketDescriptionChange(e.target.value)}
              className="mb-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button
                onClick={onCancel}
                variant="unstyled"
                className="rounded-lg bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-400 dark:bg-slate-600 dark:text-slate-200"
              >
                Cancel
              </Button>
              <Button
                onClick={onAdd}
                disabled={!ticketTitle.trim()}
                data-testid="queue-add-confirm"
                variant="unstyled"
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                Add
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
