import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/cn";

export interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  value?: string;
  "data-testid"?: string;
}

export function Checkbox({
  checked,
  onCheckedChange,
  disabled,
  id,
  className,
  value,
  "data-testid": dataTestId,
}: CheckboxProps) {
  return (
    <BaseCheckbox.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      value={value}
      data-testid={dataTestId}
      className={cn(
        "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded",
        "border border-white/50 dark:border-white/10",
        "data-[checked]:border-brand-600 data-[checked]:bg-brand-600",
        "dark:data-[checked]:border-brand-500 dark:data-[checked]:bg-brand-500",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <BaseCheckbox.Indicator className="flex text-white data-[unchecked]:hidden">
        <Check className="h-3 w-3" />
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
}
