import { useState } from "react";
import { Copy, Check, KeyRound, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface RecoveryPasskeyBannerProps {
  passkey: string;
  onDismiss: () => void;
}

export function RecoveryPasskeyBanner({
  passkey,
  onDismiss,
}: RecoveryPasskeyBannerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(passkey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <div className="flex gap-3 rounded-2xl border border-emerald-200/50 bg-emerald-50/50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/15">
      <KeyRound
        className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <p className="mb-2 text-sm font-semibold text-emerald-900 dark:text-emerald-300">
          Save your recovery passkey
        </p>
        <p className="mb-3 text-sm text-emerald-800 dark:text-emerald-400">
          Use this to reclaim your session from any browser if you get locked
          out.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg bg-emerald-100 px-3 py-2 font-mono text-base tracking-[0.25em] text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200">
            {passkey}
          </code>
          <Button
            variant="secondary"
            onClick={handleCopy}
            icon={
              copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )
            }
            aria-label="Copy recovery passkey"
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
      <Button
        onClick={onDismiss}
        variant="unstyled"
        className="shrink-0 rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/5 text-emerald-600 dark:text-emerald-400"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
