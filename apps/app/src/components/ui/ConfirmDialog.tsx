import { AlertDialog } from "@base-ui/react/alert-dialog";
import type { ReactNode } from "react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "default" | "destructive";
}

const cancelClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/60 bg-white/90 px-4 py-2 text-sm font-semibold tracking-tight text-brand-700 transition-all duration-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:hover:bg-slate-900";

const confirmClass: Record<"default" | "destructive", string> = {
  default:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-indigo-500 px-4 py-2 text-sm font-semibold tracking-tight text-white shadow-floating transition-all duration-200 hover:from-brand-600 hover:to-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
  destructive:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 px-4 py-2 text-sm font-semibold tracking-tight text-white shadow-floating transition-all duration-200 hover:from-red-600 hover:to-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
};

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "default",
}: ConfirmDialogProps) => (
  <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
    <AlertDialog.Portal>
      <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
      <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white/95 p-6 shadow-xl outline outline-1 outline-slate-200/60 backdrop-blur-xl transition-all duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 dark:bg-slate-900/95 dark:outline-white/10">
        <AlertDialog.Title className="text-lg font-semibold text-slate-900 dark:text-white">
          {title}
        </AlertDialog.Title>
        {description && (
          <AlertDialog.Description className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {description}
          </AlertDialog.Description>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <AlertDialog.Close className={cancelClass}>
            {cancelLabel}
          </AlertDialog.Close>
          <AlertDialog.Close
            onClick={onConfirm}
            className={confirmClass[variant]}
          >
            {confirmLabel}
          </AlertDialog.Close>
        </div>
      </AlertDialog.Popup>
    </AlertDialog.Portal>
  </AlertDialog.Root>
);
