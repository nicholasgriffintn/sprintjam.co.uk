import { Button } from "@/components/ui/Button";

export function ErrorBannerServerDefaults({
  defaultsError,
  handleRetryDefaults,
  isLoadingDefaults,
}: {
  defaultsError: string;
  handleRetryDefaults: () => void;
  isLoadingDefaults: boolean;
}) {
  return (
    <div className="max-w-2xl mx-auto mt-4 px-4">
      <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700 rounded-md p-3 flex items-start justify-between gap-4">
        <span>Unable to load server defaults. {defaultsError}</span>
        <Button
          type="button"
          variant="unstyled"
          onClick={handleRetryDefaults}
          className="text-sm font-medium underline"
          disabled={isLoadingDefaults}
        >
          Retry
        </Button>
      </div>
    </div>
  );
}
