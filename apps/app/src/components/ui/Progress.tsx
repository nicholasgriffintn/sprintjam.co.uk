import type { ComponentPropsWithoutRef } from "react";
import { Progress as BaseProgress } from "@base-ui/react/progress";

import { cn } from "@/lib/cn";

type ProgressProps = ComponentPropsWithoutRef<typeof BaseProgress.Root>;

export function Progress({ value = null, className, ...props }: ProgressProps) {
  return (
    <BaseProgress.Root
      value={value}
      className={cn("w-full", className)}
      {...props}
    >
      <BaseProgress.Track className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800/80">
        <BaseProgress.Indicator className="h-full rounded-full bg-gradient-to-r from-brand-500 to-indigo-500 transition-[width] duration-700 ease-out" />
      </BaseProgress.Track>
    </BaseProgress.Root>
  );
}
