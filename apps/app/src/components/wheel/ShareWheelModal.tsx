import { useState, useRef, useMemo, lazy, Suspense } from 'react';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FallbackLoading } from '@/components/ui/FallbackLoading';
import { updateWheelPasscode } from '@/lib/wheel-api-service';
import { USERNAME_STORAGE_KEY } from '@/constants';
import { safeLocalStorage } from '@/utils/storage';

const QRCodeSVG = lazy(() =>
  import('qrcode.react').then((module) => ({ default: module.QRCodeSVG })),
);

interface ShareWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  wheelKey: string;
  isModeratorView?: boolean;
}

export function ShareWheelModal({
  isOpen,
  onClose,
  wheelKey,
  isModeratorView = false,
}: ShareWheelModalProps) {
  const [copied, setCopied] = useState(false);
  const [passcodeEnabled, setPasscodeEnabled] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passcodeCopied, setPasscodeCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const shareableUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    return `${window.location.origin}/wheel/${wheelKey}`;
  }, [wheelKey]);

  const handleCopy = async () => {
    if (inputRef.current) {
      inputRef.current.select();
      try {
        await navigator.clipboard.writeText(shareableUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy text: ', error);
      }
    }
  };

  const handleCopyPasscode = async () => {
    try {
      await navigator.clipboard.writeText(passcode);
      setPasscodeCopied(true);
      setTimeout(() => setPasscodeCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy passcode: ', error);
    }
  };

  const generatePasscode = async () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPasscode(code);

    try {
      const userName = safeLocalStorage.get(USERNAME_STORAGE_KEY) || '';
      await updateWheelPasscode(wheelKey, userName, code);
    } catch (error) {
      console.error('Failed to save passcode:', error);
    }
  };

  const handlePasscodeToggle = async (enabled: boolean) => {
    setPasscodeEnabled(enabled);
    if (enabled && !passcode) {
      generatePasscode();
      return;
    }

    try {
      const userName = safeLocalStorage.get(USERNAME_STORAGE_KEY) || '';
      await updateWheelPasscode(wheelKey, userName, enabled ? passcode : null);

      if (!enabled) {
        setPasscode('');
      }
    } catch (error) {
      console.error('Failed to update passcode:', error);
      setPasscodeEnabled(!enabled);
      alert('Failed to update passcode. Please try again.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Wheel" size="md">
      <div className="space-y-6">
        <div>
          <label
            htmlFor="share-wheel-url"
            className="mb-2 block text-sm text-slate-600 dark:text-slate-300"
          >
            Share this link with your team:
          </label>
          <div className="flex gap-2">
            <input
              id="share-wheel-url"
              ref={inputRef}
              type="text"
              readOnly
              value={shareableUrl}
              aria-label="Shareable wheel URL"
              className="flex-1 rounded-2xl border border-white/50 bg-white/80 px-4 py-2.5 text-base text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:focus:ring-brand-900 dark:focus:border-brand-400"
            />
            <Button onClick={handleCopy} variant="primary" size="md">
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>

        {isModeratorView && (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label
                htmlFor="passcode-toggle"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Require passcode to join
              </label>
              <button
                id="passcode-toggle"
                type="button"
                role="switch"
                aria-checked={passcodeEnabled}
                onClick={() => handlePasscodeToggle(!passcodeEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  passcodeEnabled
                    ? 'bg-brand-600'
                    : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    passcodeEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {passcodeEnabled && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value.toUpperCase())}
                    placeholder="XXXXXX"
                    maxLength={6}
                    className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <Button
                    onClick={generatePasscode}
                    variant="secondary"
                    size="sm"
                  >
                    Generate
                  </Button>
                  <Button
                    onClick={handleCopyPasscode}
                    variant="secondary"
                    size="sm"
                  >
                    {passcodeCopied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Share this passcode separately with participants. They'll need
                  it to join the wheel.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col items-center">
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
            Or scan this QR code:
          </p>
          <div className="p-4 bg-white/80 dark:bg-slate-900/60 border border-white/50 dark:border-white/10 rounded-2xl shadow-sm">
            <Suspense fallback={<FallbackLoading />}>
              <QRCodeSVG
                value={shareableUrl}
                size={200}
                title="QR code for wheel invite link"
                role="img"
                aria-label="QR code for wheel invite link"
              />
            </Suspense>
          </div>
        </div>

        <div className="text-sm text-slate-600 dark:text-slate-300 italic">
          Anyone with this link{passcodeEnabled && ' and passcode'} can join
          this wheel room.
        </div>
      </div>
    </Modal>
  );
}
