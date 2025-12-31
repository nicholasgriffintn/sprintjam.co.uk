import type { ReactNode } from "react";
import { AlertCircle, CheckCircle, Info, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface AlertProps {
  variant?: "error" | "warning" | "success" | "info";
  children: ReactNode;
  onDismiss?: () => void;
  title?: string;
}

export const Alert = ({
  variant = "info",
  children,
  onDismiss,
  title,
}: AlertProps) => {
  const variants = {
    error: {
      container:
        "bg-rose-50/80 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50",
      icon: "text-rose-600 dark:text-rose-400",
      title: "text-rose-900 dark:text-rose-300",
      text: "text-rose-800 dark:text-rose-400",
      Icon: XCircle,
    },
    warning: {
      container:
        "bg-yellow-50/80 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900/50",
      icon: "text-yellow-600 dark:text-yellow-400",
      title: "text-yellow-900 dark:text-yellow-300",
      text: "text-yellow-800 dark:text-yellow-400",
      Icon: AlertCircle,
    },
    success: {
      container:
        "bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50",
      icon: "text-emerald-600 dark:text-emerald-400",
      title: "text-emerald-900 dark:text-emerald-300",
      text: "text-emerald-800 dark:text-emerald-400",
      Icon: CheckCircle,
    },
    info: {
      container:
        "bg-blue-50/80 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50",
      icon: "text-blue-600 dark:text-blue-400",
      title: "text-blue-900 dark:text-blue-300",
      text: "text-blue-800 dark:text-blue-400",
      Icon: Info,
    },
  };

  const config = variants[variant];
  const IconComponent = config.Icon;

  return (
    <div
      className={`flex gap-3 rounded-2xl border p-4 ${config.container}`}
      role="alert"
    >
      <IconComponent
        className={`h-5 w-5 shrink-0 ${config.icon}`}
        aria-hidden="true"
      />
      <div className="flex-1">
        {title && (
          <div className={`mb-1 font-semibold ${config.title}`}>{title}</div>
        )}
        <div className={`text-sm ${config.text}`}>{children}</div>
      </div>
      {onDismiss && (
        <Button
          onClick={onDismiss}
          variant="unstyled"
          className={`shrink-0 rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/5 ${config.icon}`}
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
