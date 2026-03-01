import { Separator as BaseSeparator } from "@base-ui/react/separator";

import { cn } from "@/lib/cn";

type SeparatorProps = {
  orientation?: "horizontal" | "vertical";
  className?: string;
};

export const Separator = ({
  orientation = "horizontal",
  className,
}: SeparatorProps) => {
  return (
    <BaseSeparator
      orientation={orientation}
      className={cn(
        "shrink-0 bg-slate-300 dark:bg-slate-600",
        orientation === "vertical" ? "w-px" : "h-px w-full",
        className,
      )}
    />
  );
};
