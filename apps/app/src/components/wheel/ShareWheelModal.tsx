import { useState, useRef, useMemo, lazy, Suspense, useEffect } from "react";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FallbackLoading } from "@/components/ui/FallbackLoading";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { toast } from "@/components/ui";
import { copyText } from "@/lib/clipboard";
import {
  getWheelAccessSettings,
  updateWheelPasscode,
} from "@/lib/wheel-api-service";
import { validatePasscode } from "@/utils/validators";

const QRCodeSVG = lazy(() =>
  import("qrcode.react").then((module) => ({ default: module.QRCodeSVG })),
);

interface ShareWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  wheelKey: string;
  userName: string;
  isModeratorView?: boolean;
}

function buildGeneratedPasscode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function ShareWheelModal({
  isOpen,
  onClose,
  wheelKey,
  userName,
  isModeratorView = false,
}: ShareWheelModalProps) {
  const [passcodeEnabled, setPasscodeEnabled] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [hasExistingPasscode, setHasExistingPasscode] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingPasscode, setIsSavingPasscode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const passcodeValidation = validatePasscode(passcode);

  const shareableUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return `${window.location.origin}/wheel/${wheelKey}`;
  }, [wheelKey]);

  useEffect(() => {
    if (!isOpen || !isModeratorView) {
      return;
    }

    let cancelled = false;
    setIsLoadingSettings(true);

    getWheelAccessSettings(wheelKey, userName)
      .then((settings) => {
        if (cancelled) {
          return;
        }

        setPasscodeEnabled(settings.hasPasscode);
        setHasExistingPasscode(settings.hasPasscode);
        setPasscode("");
      })
      .catch((error) => {
        console.error("Failed to load wheel access settings:", error);
        if (!cancelled) {
          toast.error("Couldn't load wheel access settings");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSettings(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isModeratorView, isOpen, userName, wheelKey]);

  const handleCopy = async () => {
    if (inputRef.current) {
      inputRef.current.select();
      try {
        await copyText(shareableUrl);
        toast.success("Wheel link copied");
      } catch (error) {
        console.error("Failed to copy text: ", error);
        toast.error("Couldn't copy wheel link");
      }
    }
  };

  const handleCopyPasscode = async () => {
    if (!passcode) {
      return;
    }

    try {
      await copyText(passcode);
      toast.success("Passcode copied");
    } catch (error) {
      console.error("Failed to copy passcode: ", error);
      toast.error("Couldn't copy passcode");
    }
  };

  const savePasscode = async (nextPasscode: string | null) => {
    setIsSavingPasscode(true);

    try {
      await updateWheelPasscode(wheelKey, userName, nextPasscode);
      setHasExistingPasscode(!!nextPasscode);

      if (!nextPasscode) {
        setPasscode("");
      }

      return true;
    } catch (error) {
      console.error("Failed to update passcode:", error);
      toast.error("Couldn't update passcode");
      return false;
    } finally {
      setIsSavingPasscode(false);
    }
  };

  const handleGeneratePasscode = () => {
    const generatedPasscode = buildGeneratedPasscode();
    setPasscode(generatedPasscode);
    return generatedPasscode;
  };

  const handleSavePasscode = async () => {
    const nextPasscode = passcode.trim().toUpperCase();

    if (!nextPasscode) {
      toast.error("Enter a passcode first");
      return;
    }

    if (!passcodeValidation.ok) {
      toast.error(passcodeValidation.error || "Invalid passcode");
      return;
    }

    const saved = await savePasscode(nextPasscode);
    if (saved) {
      setPasscode(nextPasscode);
      toast.success(
        hasExistingPasscode ? "Passcode rotated" : "Passcode saved",
      );
    }
  };

  const handlePasscodeToggle = async (enabled: boolean) => {
    if (enabled) {
      const nextPasscode =
        passcode.trim().toUpperCase() || handleGeneratePasscode();
      setPasscodeEnabled(true);
      const saved = await savePasscode(nextPasscode);
      if (saved) {
        setPasscode(nextPasscode);
        toast.success("Passcode protection enabled");
      } else {
        setPasscodeEnabled(false);
      }
      return;
    }

    const disabled = await savePasscode(null);
    if (disabled) {
      setPasscodeEnabled(false);
      toast.success("Passcode protection removed");
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
              Copy
            </Button>
          </div>
        </div>

        {isModeratorView && (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <label
                htmlFor="passcode-toggle"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Require passcode to join
              </label>
              <Switch
                id="passcode-toggle"
                checked={passcodeEnabled}
                onCheckedChange={handlePasscodeToggle}
                disabled={isLoadingSettings || isSavingPasscode}
              />
            </div>

            {passcodeEnabled && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Input
                    id="wheel-passcode-input"
                    label="Passcode"
                    type="text"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value.toUpperCase())}
                    placeholder={
                      hasExistingPasscode ? "Enter a new passcode" : "XXXXXX"
                    }
                    maxLength={64}
                    fullWidth
                    className="min-w-[180px] font-mono tracking-[0.15em]"
                    disabled={isSavingPasscode}
                    error={
                      passcode.trim() && !passcodeValidation.ok
                        ? passcodeValidation.error
                        : undefined
                    }
                  />
                  <Button
                    onClick={handleSavePasscode}
                    variant="secondary"
                    size="sm"
                    disabled={
                      isSavingPasscode ||
                      !passcode.trim() ||
                      !passcodeValidation.ok
                    }
                  >
                    Save code
                  </Button>
                  <Button
                    onClick={handleCopyPasscode}
                    variant="secondary"
                    size="sm"
                    disabled={!passcode}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {hasExistingPasscode && !passcode
                    ? "A passcode is already active. Enter a new code if you want to rotate it."
                    : "Share this passcode separately with participants. They'll need it to join the wheel."}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col items-center">
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
            Or scan this QR code:
          </p>
          <div className="rounded-2xl border border-white/50 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
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

        <div className="text-sm italic text-slate-600 dark:text-slate-300">
          Anyone with this link{passcodeEnabled && " and passcode"} can join
          this wheel room.
        </div>
      </div>
    </Modal>
  );
}
