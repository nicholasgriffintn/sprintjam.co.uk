import { useState } from "react";
import { Copy, Check, KeyRound } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface RecoveryPasskeyModalProps {
  passkey: string | null;
  onDismiss: () => void;
}

export function RecoveryPasskeyModal({
  passkey,
  onDismiss,
}: RecoveryPasskeyModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!passkey) return;
    try {
      await navigator.clipboard.writeText(passkey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <Modal isOpen={!!passkey} onClose={onDismiss} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <KeyRound className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Save your recovery passkey
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Use this passkey to reclaim your session from another browser or
              device if you get locked out.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 dark:bg-emerald-900/20">
          <code className="flex-1 font-mono text-lg tracking-[0.25em] text-emerald-900 dark:text-emerald-200">
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

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Keep this somewhere safe — it won&apos;t be shown again.
        </p>

        <Button onClick={onDismiss} fullWidth>
          Got it
        </Button>
      </div>
    </Modal>
  );
}
