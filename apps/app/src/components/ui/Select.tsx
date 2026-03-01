import { useMemo, type ChangeEvent, type SelectHTMLAttributes } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronDown } from "lucide-react";

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
  searchable?: boolean;
  searchPlaceholder?: string;
  searchMinOptions?: number;
  "data-testid"?: string;
};

const SELECT_BASE_CLASSNAME =
  "w-full appearance-none rounded-2xl border border-white/50 bg-white/80 px-4 py-3 pr-10 text-base text-slate-900 shadow-sm transition focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-900 dark:disabled:bg-slate-800 dark:disabled:text-slate-500";

export function Select({
  options,
  className,
  onValueChange,
  onChange,
  placeholder,
  searchable = false,
  searchPlaceholder = "Search options...",
  searchMinOptions = 12,
  "data-testid": dataTestId,
  id,
  value,
  defaultValue,
  ...props
}: SelectProps) {
  const showSearchableSelect =
    searchable && !props.multiple && options.length >= searchMinOptions;

  const handleNativeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange?.(event);
    onValueChange?.(event.currentTarget.value);
  };

  // Resolved value for the Combobox path (controlled or uncontrolled).
  // Empty string is treated as no selection (matches native select placeholder behaviour).
  const selectedOption = useMemo(() => {
    if (value === undefined) return undefined;
    const strVal = String(value);
    if (strVal === "") return null;
    return options.find((o) => o.value === strVal) ?? null;
  }, [options, value]);

  const defaultOption = useMemo(() => {
    if (defaultValue === undefined || typeof defaultValue !== "string") {
      return null;
    }
    return options.find((o) => o.value === defaultValue) ?? null;
  }, [options, defaultValue]);

  if (!showSearchableSelect) {
    const nativeValueProps =
      value !== undefined
        ? { value }
        : { defaultValue: defaultValue ?? (placeholder ? "" : undefined) };

    return (
      <div className="relative">
        <select
          {...props}
          id={id}
          {...nativeValueProps}
          data-testid={dataTestId}
          onChange={handleNativeChange}
          className={cn(SELECT_BASE_CLASSNAME, className)}
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

  // Combobox path for searchable selects
  const comboboxValueProps =
    selectedOption !== undefined
      ? { value: selectedOption }
      : { defaultValue: defaultOption };

  return (
    <div className="relative">
      <Combobox.Root
        items={options.filter((o) => o.value !== "")}
        {...comboboxValueProps}
        onValueChange={(item) => {
          if (item) onValueChange?.(item.value);
        }}
        itemToStringLabel={(item) => item?.label ?? ""}
        isItemEqualToValue={(a, b) => (a?.value ?? "") === (b?.value ?? "")}
        disabled={props.disabled}
      >
        <Combobox.Input
          id={id}
          data-testid={dataTestId}
          placeholder={searchPlaceholder}
          className={cn(SELECT_BASE_CLASSNAME, className)}
        />
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
        <Combobox.Portal>
          <Combobox.Positioner sideOffset={4} className="z-[200]">
            <Combobox.Popup className="w-(--anchor-width) rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <Combobox.List className="max-h-56 space-y-1 overflow-y-auto">
                {(item: SelectOption | undefined) => {
                  if (!item) return null;
                  return (
                    <Combobox.Item
                      value={item}
                      disabled={item.disabled}
                      className={cn(
                        "flex w-full cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition dark:text-slate-200",
                        "data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800",
                        "data-selected:bg-brand-50 data-selected:text-brand-700 dark:data-selected:bg-brand-900/30 dark:data-selected:text-brand-200",
                        item.disabled && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <span className="flex-1 truncate">{item.label}</span>
                      <Combobox.ItemIndicator className="ml-auto">
                        <Check className="h-4 w-4 shrink-0" />
                      </Combobox.ItemIndicator>
                    </Combobox.Item>
                  );
                }}
              </Combobox.List>
              <Combobox.Empty className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                No matching options
              </Combobox.Empty>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  );
}
