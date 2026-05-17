import { lazy, type ReactNode, Suspense, useMemo, useRef } from "react";

import { Button } from "@/components/ui/Button";
import { FallbackLoading } from "@/components/ui/FallbackLoading";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui";
import { copyText } from "@/lib/clipboard";
import { getSessionShareUrl, type ShareSessionType } from "@/lib/session-share";

const QRCodeSVG = lazy(() =>
  import("qrcode.react").then((module) => ({ default: module.QRCodeSVG })),
);

interface ShareSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  sessionType: ShareSessionType;
  sessionKey: string;
  inputId: string;
  inputAriaLabel: string;
  copySuccessMessage: string;
  copyErrorMessage: string;
  qrCodeTitle: string;
  footer: ReactNode;
  children?: ReactNode;
}

export function ShareSessionModal({
  isOpen,
  onClose,
  title,
  sessionType,
  sessionKey,
  inputId,
  inputAriaLabel,
  copySuccessMessage,
  copyErrorMessage,
  qrCodeTitle,
  footer,
  children,
}: ShareSessionModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const shareableUrl = useMemo(
    () => getSessionShareUrl(sessionType, sessionKey),
    [sessionKey, sessionType],
  );

  const handleCopy = async () => {
    if (!inputRef.current) {
      return;
    }

    inputRef.current.select();

    try {
      await copyText(shareableUrl);
      toast.success(copySuccessMessage);
    } catch (error) {
      console.error("Failed to copy share link:", error);
      toast.error(copyErrorMessage);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-6">
        <div>
          <label
            htmlFor={inputId}
            className="mb-2 block text-sm text-slate-600 dark:text-slate-300"
          >
            Share this link with your team:
          </label>
          <div className="flex gap-2">
            <input
              id={inputId}
              ref={inputRef}
              type="text"
              readOnly
              value={shareableUrl}
              aria-label={inputAriaLabel}
              className="flex-1 rounded-2xl border border-white/50 bg-white/80 px-4 py-2.5 text-base text-slate-900 shadow-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-900"
            />
            <Button onClick={handleCopy} variant="primary" size="md">
              Copy
            </Button>
          </div>
        </div>

        {children}

        <div className="flex flex-col items-center">
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
            Or scan this QR code:
          </p>
          <div className="rounded-2xl border border-white/50 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
            <Suspense fallback={<FallbackLoading />}>
              <QRCodeSVG
                value={shareableUrl}
                size={200}
                title={qrCodeTitle}
                role="img"
                aria-label={qrCodeTitle}
              />
            </Suspense>
          </div>
        </div>

        <div className="text-sm italic text-slate-600 dark:text-slate-300">
          {footer}
        </div>
      </div>
    </Modal>
  );
}
