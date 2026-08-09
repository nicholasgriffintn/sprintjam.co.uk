import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/Button";

type BackButtonProps = {
  disabled?: boolean;
  label: string;
  onClick: () => void;
};

export function BackButton({ disabled, label, onClick }: BackButtonProps) {
  return (
    <Button
      type="button"
      variant="unstyled"
      disabled={disabled}
      onClick={onClick}
      icon={<ArrowLeft className="h-4 w-4" />}
      className="p-0 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
    >
      {label}
    </Button>
  );
}
