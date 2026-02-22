import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/cn";

export type SelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  options: SelectOption[];
  onValueChange?: (value: string) => void;
  placeholder?: string;
};

export function Select({
  options,
  className,
  onValueChange,
  onChange,
  placeholder,
  value,
  defaultValue,
  ...props
}: SelectProps) {
  const selectValueProps =
    value !== undefined
      ? { value }
      : { defaultValue: defaultValue ?? (placeholder ? "" : undefined) };

  return (
    <div className="relative">
      <select
        {...props}
        {...selectValueProps}
        onChange={(event) => {
          onChange?.(event);
          onValueChange?.(event.currentTarget.value);
        }}
        className={cn(
          "w-full appearance-none rounded-2xl border border-white/50 bg-white/80 px-4 py-3 pr-10 text-base text-slate-900 shadow-sm transition focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-900 dark:disabled:bg-slate-800 dark:disabled:text-slate-500",
          className,
        )}
      >
        {placeholder && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
    </div>
  );
}
