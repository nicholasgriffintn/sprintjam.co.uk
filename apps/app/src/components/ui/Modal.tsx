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
      <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
        <Dialog.Popup className={cn("w-full", sizeClasses[size])}>
          <SurfaceCard className={cn(!title && "relative")}>
            {title ? (
              <div className="mb-6 flex items-center justify-between">
                <Dialog.Title className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {title}
                </Dialog.Title>
                <Dialog.Close
                  aria-label="Close modal"
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
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
    </Dialog.Portal>
  </Dialog.Root>
);
