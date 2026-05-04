import type { TextareaHTMLAttributes } from "react";
import { useId } from "react";

import { cn } from "@/lib/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  variant?: "default" | "error";
}

export const Textarea = ({
  label,
  error,
  helperText,
  fullWidth,
  variant = "default",
  className,
  id,
  disabled,
  ...props
}: TextareaProps) => {
  const generatedId = useId();
  const textareaId = id || `textarea-${generatedId}`;
  const helperId =
    (error || helperText) && textareaId ? `${textareaId}-helper` : undefined;

  const isError = variant === "error" || !!error;

  return (
    <div className={cn("flex flex-col gap-1", fullWidth && "w-full")}>
      {label ? (
        <label
          htmlFor={textareaId}
          className="text-sm font-semibold text-slate-700 dark:text-slate-200"
        >
          {label}
        </label>
      ) : null}
      <textarea
        id={textareaId}
        disabled={disabled}
        aria-describedby={helperId}
        aria-invalid={isError}
        className={cn(
          "rounded-2xl border bg-white/80 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition",
          "placeholder:text-slate-400",
          "focus:ring-2",
          "dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500",
          "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
          "dark:disabled:bg-slate-800 dark:disabled:text-slate-400",
          "resize-y",
          isError
            ? "border-rose-200/80 focus:border-rose-300 focus:ring-rose-200 dark:border-rose-400/20 dark:bg-slate-950/60"
            : "border-white/50 focus:border-brand-300 focus:ring-brand-200 dark:border-white/10 dark:focus:border-brand-400 dark:focus:ring-brand-900",
          fullWidth && "w-full",
          className,
        )}
        {...props}
      />
      {helperText || error ? (
        <p
          id={helperId}
          className={cn(
            "text-xs",
            error
              ? "text-red-600 dark:text-red-400"
              : "text-slate-500 dark:text-slate-400",
          )}
        >
          {error || helperText}
        </p>
      ) : null}
    </div>
  );
};
