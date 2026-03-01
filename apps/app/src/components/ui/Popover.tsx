import { Popover as BasePopover } from "@base-ui/react/popover";
import { type ReactNode } from "react";

import { cn } from "@/lib/cn";

interface PopoverProps {
  trigger: ReactNode;
  title?: string;
  children: ReactNode;
  className?: string;
  sideOffset?: number;
}

export const Popover = ({
  trigger,
  title,
  children,
  className,
  sideOffset = 8,
}: PopoverProps) => (
  <BasePopover.Root>
    <BasePopover.Trigger asChild>{trigger}</BasePopover.Trigger>
    <BasePopover.Portal>
      <BasePopover.Positioner sideOffset={sideOffset}>
        <BasePopover.Popup
          className={cn(
            "z-50 max-w-xs origin-[var(--transform-origin)] rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-700 shadow-lg transition-[transform,scale,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200",
            className,
          )}
        >
          {title ? (
            <BasePopover.Title className="mb-1 font-semibold text-slate-900 dark:text-white">
              {title}
            </BasePopover.Title>
          ) : null}
          <BasePopover.Description asChild>
            <div>{children}</div>
          </BasePopover.Description>
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  </BasePopover.Root>
);
