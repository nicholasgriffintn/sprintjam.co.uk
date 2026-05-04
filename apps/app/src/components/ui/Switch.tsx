import { Switch as BaseSwitch } from "@base-ui/react/switch";

import { cn } from "@/lib/cn";

export interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  "data-testid"?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  id,
  className,
  "data-testid": dataTestId,
}: SwitchProps) {
  return (
    <BaseSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      data-testid={dataTestId}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
        "data-[checked]:bg-brand-600 dark:data-[checked]:bg-brand-500",
        "data-[unchecked]:bg-slate-200 dark:data-[unchecked]:bg-slate-700",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <BaseSwitch.Thumb
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          "data-[checked]:translate-x-5 data-[unchecked]:translate-x-0",
        )}
      />
    </BaseSwitch.Root>
  );
}
