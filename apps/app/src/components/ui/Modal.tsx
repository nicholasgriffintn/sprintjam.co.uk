import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { SurfaceCard } from "./SurfaceCard";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
};

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) => (
  <Dialog.Root
    open={isOpen}
    onOpenChange={(open) => {
      if (!open) onClose();
    }}
  >
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
      <Dialog.Viewport className="fixed inset-0 z-50 overflow-y-auto overscroll-contain p-4 sm:p-6">
        <div className="flex min-h-full items-start justify-center py-4 sm:items-center sm:py-8">
          <Dialog.Popup
            className={cn(
              "w-full transition-all duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
              sizeClasses[size],
            )}
          >
            <SurfaceCard
              className={cn("w-full max-w-full", !title && "relative")}
            >
              {title ? (
                <div className="mb-6 flex items-center justify-between gap-4">
                  <Dialog.Title className="text-2xl font-semibold text-slate-900 dark:text-white">
                    {title}
                  </Dialog.Title>
                  <Dialog.Close
                    aria-label="Close modal"
                    className="shrink-0 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                  >
                    <X className="h-5 w-5" />
                  </Dialog.Close>
                </div>
              ) : (
                <Dialog.Close
                  aria-label="Close modal"
                  className="absolute right-6 top-6 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                >
                  <X className="h-5 w-5" />
                </Dialog.Close>
              )}
              {children}
            </SurfaceCard>
          </Dialog.Popup>
        </div>
      </Dialog.Viewport>
    </Dialog.Portal>
  </Dialog.Root>
);
