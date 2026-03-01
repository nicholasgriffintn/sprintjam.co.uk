import * as React from "react";
import { NumberField } from "@base-ui/react/number-field";

import { cn } from "@/lib/cn";

export function Root({ className, ...props }: NumberField.Root.Props) {
  return (
    <NumberField.Root
      className={cn("flex flex-col items-start gap-1", className)}
      {...props}
    />
  );
}

export function Group({ className, ...props }: NumberField.Group.Props) {
  return <NumberField.Group className={cn("flex", className)} {...props} />;
}

export function Decrement({
  className,
  ...props
}: NumberField.Decrement.Props) {
  return (
    <NumberField.Decrement
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-l-2xl border border-white/50 bg-white/80 text-slate-700 shadow-sm transition select-none",
        "hover:bg-white/90 active:bg-slate-100",
        "dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800/80",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  NumberField.Input.Props
>(function Input({ className, ...props }: NumberField.Input.Props, ref) {
  return (
    <NumberField.Input
      ref={ref}
      className={cn(
        "h-10 w-16 border-y border-white/50 bg-white/80 text-center text-base text-slate-900 tabular-nums shadow-sm transition",
        "focus:outline focus:outline-2 focus:-outline-offset-1 focus:outline-brand-400",
        "dark:border-white/10 dark:bg-slate-900/60 dark:text-white",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});

export function Increment({
  className,
  ...props
}: NumberField.Increment.Props) {
  return (
    <NumberField.Increment
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-r-2xl border border-white/50 bg-white/80 text-slate-700 shadow-sm transition select-none",
        "hover:bg-white/90 active:bg-slate-100",
        "dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800/80",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
