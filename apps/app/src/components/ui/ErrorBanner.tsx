import type { FC } from "react";
import { ShieldX, X } from "lucide-react";

import { Button } from "@/components/ui/Button";

interface ErrorBannerProps {
  message: string;
  onClose: () => void;
  variant?: "error" | "warning";
}

const ErrorBanner: FC<ErrorBannerProps> = ({
  message,
  onClose,
  variant = "error",
}) => {
  const baseStyles =
    variant === "warning"
      ? "bg-amber-100 dark:bg-amber-900 text-white-800 dark:text-white-300 border-amber-300 dark:border-amber-800"
      : "bg-red-100 dark:bg-red-900 text-white-700 dark:text-white-400 border-red-300 dark:border-red-800";

  return (
    <div
      className={`fixed bottom-10 right-10 z-100 p-3 m-4 border rounded-md shadow-lg ${baseStyles}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center">
          <ShieldX className="h-5 w-5 mr-2" />
          <span>{message}</span>
        </div>
        <Button
          type="button"
          variant="unstyled"
          onClick={onClose}
          className="text-inherit hover:opacity-80"
          aria-label="Close error message"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ErrorBanner;
