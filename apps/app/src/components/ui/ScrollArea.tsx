import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/cn";

type ViewportProps = Omit<
  ComponentPropsWithoutRef<typeof BaseScrollArea.Viewport>,
  "children" | "className"
>;

export interface ScrollAreaProps extends ViewportProps {
  children: ReactNode;
  className?: string;
  rootClassName?: string;
  contentClassName?: string;
  scrollbarClassName?: string;
  thumbClassName?: string;
  focusable?: boolean;
  showHorizontalScrollbar?: boolean;
}

const SCROLLBAR_BASE_CLASSNAME =
  "pointer-events-none absolute z-10 flex rounded-full bg-slate-200/90 opacity-0 transition-opacity duration-150 dark:bg-slate-700/80 data-[hovering]:pointer-events-auto data-[hovering]:opacity-100 data-[scrolling]:pointer-events-auto data-[scrolling]:opacity-100 data-[scrolling]:duration-0";

const THUMB_BASE_CLASSNAME =
  "flex-1 rounded-full bg-slate-400/90 dark:bg-slate-300/70 data-[orientation=vertical]:w-full data-[orientation=horizontal]:h-full";

export const ScrollArea = ({
  children,
  className,
  rootClassName,
  contentClassName,
  scrollbarClassName,
  thumbClassName,
  focusable = true,
  showHorizontalScrollbar = false,
  tabIndex,
  ...viewportProps
}: ScrollAreaProps) => {
  return (
    <BaseScrollArea.Root
      className={cn(
        "relative flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-hidden",
        rootClassName,
      )}
    >
      <BaseScrollArea.Viewport
        tabIndex={focusable ? (tabIndex ?? 0) : tabIndex}
        className={cn(
          "min-h-0 min-w-0 w-full max-w-full flex-1 rounded-[inherit] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500/70 dark:focus-visible:outline-brand-300/70",
          !showHorizontalScrollbar && "overflow-x-hidden",
          className,
        )}
        {...viewportProps}
      >
        <BaseScrollArea.Content
          className={cn("min-w-0 w-full max-w-full", contentClassName)}
        >
          {children}
        </BaseScrollArea.Content>
      </BaseScrollArea.Viewport>
      <BaseScrollArea.Scrollbar
        className={cn(
          SCROLLBAR_BASE_CLASSNAME,
          "inset-y-2 right-1 w-1",
          scrollbarClassName,
        )}
      >
        <BaseScrollArea.Thumb
          className={cn(THUMB_BASE_CLASSNAME, thumbClassName)}
        />
      </BaseScrollArea.Scrollbar>
      {showHorizontalScrollbar ? (
        <>
          <BaseScrollArea.Scrollbar
            orientation="horizontal"
            className={cn(
              SCROLLBAR_BASE_CLASSNAME,
              "inset-x-2 bottom-1 h-1",
              scrollbarClassName,
            )}
          >
            <BaseScrollArea.Thumb
              className={cn(THUMB_BASE_CLASSNAME, thumbClassName)}
            />
          </BaseScrollArea.Scrollbar>
          <BaseScrollArea.Corner className="bg-slate-200/90 dark:bg-slate-700/80" />
        </>
      ) : null}
    </BaseScrollArea.Root>
  );
};
