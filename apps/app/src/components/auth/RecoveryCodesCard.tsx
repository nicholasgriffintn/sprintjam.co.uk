import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

type RecoveryCodesCardProps = {
  codes: string[];
  onCopy: () => void;
  onDownload: () => void;
  onContinue: () => void;
};

export function RecoveryCodesCard({
  codes,
  onCopy,
  onDownload,
  onContinue,
}: RecoveryCodesCardProps) {
  return (
    <SurfaceCard>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Save your recovery codes
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Store these somewhere safe. You can use them if you lose access to
            your authenticator.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200">
          {codes.map((value) => (
            <span key={value} className="text-center">
              {value}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            size="md"
            onClick={onCopy}
          >
            Copy codes
          </Button>
          <Button
            type="button"
            variant="ghost"
            fullWidth
            size="md"
            onClick={onDownload}
          >
            Download .txt
          </Button>
        </div>

        <Button type="button" fullWidth size="lg" onClick={onContinue}>
          Continue to workspace
        </Button>
      </div>
    </SurfaceCard>
  );
}
