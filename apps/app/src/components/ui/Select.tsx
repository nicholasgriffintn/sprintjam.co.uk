import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type SelectHTMLAttributes,
} from "react";
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

const getSelectableIndices = (items: SelectOption[]) =>
  items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !item.disabled)
    .map(({ index }) => index);

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
  const instanceId = useId().replace(/:/g, "");
  const listboxId = `${dataTestId ?? instanceId}-listbox`;

  const isControlled = value !== undefined;
  const fallbackDefaultValue =
    typeof defaultValue === "string" ? defaultValue : "";
  const [internalValue, setInternalValue] = useState(fallbackDefaultValue);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeOptionIndex, setActiveOptionIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hiddenSelectRef = useRef<HTMLSelectElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  const showSearchableSelect =
    searchable && !props.multiple && options.length >= searchMinOptions;

  const selectedValue = String(isControlled ? (value ?? "") : internalValue);

  useEffect(() => {
    if (isControlled) return;
    setInternalValue(fallbackDefaultValue);
  }, [fallbackDefaultValue, isControlled]);

  useEffect(() => {
    if (!showSearchableSelect || !isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
        setActiveOptionIndex(-1);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isOpen, showSearchableSelect]);

  useEffect(() => {
    if (!isOpen || !showSearchableSelect) return;
    searchInputRef.current?.focus();
  }, [isOpen, showSearchableSelect]);

  const filteredOptions = useMemo(() => {
    if (!showSearchableSelect) return options;

    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return options;

    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(normalizedQuery) ||
        option.value.toLowerCase().includes(normalizedQuery),
    );
  }, [options, searchQuery, showSearchableSelect]);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === selectedValue),
    [options, selectedValue],
  );

  useEffect(() => {
    if (!isOpen) return;

    const selectedIndex = filteredOptions.findIndex(
      (option) => option.value === selectedValue && !option.disabled,
    );

    const firstSelectableIndex = filteredOptions.findIndex(
      (option) => !option.disabled,
    );

    setActiveOptionIndex((current) => {
      if (
        current >= 0 &&
        current < filteredOptions.length &&
        !filteredOptions[current]?.disabled
      ) {
        return current;
      }

      if (selectedIndex !== -1) {
        return selectedIndex;
      }

      // Don't auto-highlight first option when placeholder is shown and nothing is selected
      if (placeholder && !selectedValue) {
        return -1;
      }

      return firstSelectableIndex;
    });
  }, [filteredOptions, isOpen, selectedValue, placeholder]);

  // Scroll the active option into view when keyboard navigating
  useEffect(() => {
    if (activeOptionIndex < 0 || !listboxRef.current) return;
    const activeEl = listboxRef.current.querySelector<HTMLElement>(
      `[id="${listboxId}-option-${activeOptionIndex}"]`,
    );
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeOptionIndex, listboxId]);

  const closeSearchMenu = () => {
    setIsOpen(false);
    setSearchQuery("");
    setActiveOptionIndex(-1);
  };

  const openSearchMenu = () => {
    if (props.disabled) return;
    setSearchQuery("");
    setIsOpen(true);
  };

  const moveActiveOption = (direction: 1 | -1) => {
    const selectableIndices = getSelectableIndices(filteredOptions);

    if (selectableIndices.length === 0) {
      setActiveOptionIndex(-1);
      return;
    }

    setActiveOptionIndex((current) => {
      const currentPosition = selectableIndices.indexOf(current);
      if (currentPosition === -1) {
        return direction === 1
          ? selectableIndices[0]
          : selectableIndices[selectableIndices.length - 1];
      }

      const nextPosition =
        (currentPosition + direction + selectableIndices.length) %
        selectableIndices.length;

      return selectableIndices[nextPosition];
    });
  };

  const handleNativeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (!isControlled) {
      setInternalValue(event.currentTarget.value);
    }
    onChange?.(event);
    onValueChange?.(event.currentTarget.value);
  };

  const notifyValueChange = (nextValue: string) => {
    if (!isControlled) {
      setInternalValue(nextValue);
    }

    if (hiddenSelectRef.current) {
      hiddenSelectRef.current.value = nextValue;
      hiddenSelectRef.current.dispatchEvent(
        new Event("change", { bubbles: true }),
      );
      return;
    }

    onValueChange?.(nextValue);
  };

  const selectOption = (option: SelectOption) => {
    if (option.disabled) return;
    notifyValueChange(option.value);
    closeSearchMenu();
    triggerRef.current?.focus();
  };

  const selectActiveOption = () => {
    if (activeOptionIndex < 0 || activeOptionIndex >= filteredOptions.length) {
      return;
    }

    const option = filteredOptions[activeOptionIndex];
    if (!option || option.disabled) return;

    selectOption(option);
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (props.disabled) return;

    if (event.key === "Tab") {
      if (isOpen) closeSearchMenu();
      return;
    }

    if (event.key === "Escape") {
      if (isOpen) {
        event.preventDefault();
        closeSearchMenu();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        openSearchMenu();
        return;
      }
      moveActiveOption(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        openSearchMenu();
        return;
      }
      moveActiveOption(-1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isOpen) {
        openSearchMenu();
      } else {
        selectActiveOption();
      }
    }
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Tab") {
      // Close menu but don't prevent default so Tab moves focus naturally
      closeSearchMenu();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeSearchMenu();
      triggerRef.current?.focus();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActiveOption(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveOption(-1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      const selectableIndices = getSelectableIndices(filteredOptions);
      setActiveOptionIndex(
        selectableIndices.length > 0 ? selectableIndices[0] : -1,
      );
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const selectableIndices = getSelectableIndices(filteredOptions);
      setActiveOptionIndex(
        selectableIndices.length > 0
          ? selectableIndices[selectableIndices.length - 1]
          : -1,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      selectActiveOption();
    }
  };

  const nativeSelectValueProps = isControlled
    ? { value }
    : { defaultValue: defaultValue ?? (placeholder ? "" : undefined) };

  if (!showSearchableSelect) {
    return (
      <div className="relative">
        <select
          {...props}
          id={id}
          {...nativeSelectValueProps}
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

  const triggerLabel =
    selectedOption?.label ?? placeholder ?? "Select an option";
  const activeOptionId =
    activeOptionIndex >= 0
      ? `${listboxId}-option-${activeOptionIndex}`
      : undefined;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        disabled={props.disabled}
        data-testid={dataTestId}
        onClick={() => {
          if (isOpen) {
            closeSearchMenu();
          } else {
            openSearchMenu();
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          SELECT_BASE_CLASSNAME,
          "relative text-left",
          !selectedOption && "text-slate-500 dark:text-slate-400",
          className,
        )}
      >
        <span className="block truncate pr-4">{triggerLabel}</span>
        <ChevronDown
          className={cn(
            "pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-transform duration-200 dark:text-slate-400",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute z-40 mt-2 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={searchPlaceholder}
            aria-label="Search options"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-activedescendant={activeOptionId}
            data-testid={dataTestId ? `${dataTestId}-search` : undefined}
            className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-900"
          />

          <div
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            aria-label="Options"
            className="max-h-56 space-y-1 overflow-y-auto"
          >
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                No matching options
              </p>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === selectedValue;
                const isActive = index === activeOptionIndex;

                return (
                  <div
                    key={option.value}
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                    onMouseEnter={() =>
                      !option.disabled && setActiveOptionIndex(index)
                    }
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectOption(option)}
                    className={cn(
                      "flex w-full cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition dark:text-slate-200",
                      !option.disabled &&
                        "hover:bg-slate-100 dark:hover:bg-slate-800",
                      option.disabled && "cursor-not-allowed opacity-60",
                      isSelected &&
                        "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200",
                      isActive &&
                        !option.disabled &&
                        "ring-2 ring-brand-200 dark:ring-brand-700",
                    )}
                  >
                    <span className="flex-1 truncate">{option.label}</span>
                    {isSelected && <Check className="h-4 w-4 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <select
        ref={hiddenSelectRef}
        {...props}
        id={id ? `${id}-native` : undefined}
        value={selectedValue}
        onChange={handleNativeChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
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
    </div>
  );
}
