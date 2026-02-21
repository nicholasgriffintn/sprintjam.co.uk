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
          "h-10 w-full appearance-none rounded-md border border-slate-300/70 bg-white/85 px-3 pr-8 text-sm text-slate-800 shadow-sm transition-colors focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-white/20 dark:bg-slate-950/35 dark:text-slate-200 dark:focus:border-brand-400 dark:focus:ring-brand-900 dark:disabled:bg-slate-800 dark:disabled:text-slate-500",
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
