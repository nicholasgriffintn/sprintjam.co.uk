import { useState, useEffect } from "react";
import { secureRandomString } from "@sprintjam/utils";

import { Button } from "@/components/ui/Button";
import { ShareSessionModal } from "@/components/share/ShareSessionModal";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { toast } from "@/components/ui";
import { copyText } from "@/lib/clipboard";
import {
  getWheelAccessSettings,
  updateWheelPasscode,
} from "@/lib/wheel-api-service";
import { validatePasscode } from "@/utils/validators";

interface ShareWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  wheelKey: string;
  userName: string;
  isModeratorView?: boolean;
}

function buildGeneratedPasscode() {
  return secureRandomString("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 6);
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
  const passcodeValidation = validatePasscode(passcode);

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
    <ShareSessionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Wheel"
      sessionType="wheel"
      sessionKey={wheelKey}
      inputId="share-wheel-url"
      inputAriaLabel="Shareable wheel URL"
      copySuccessMessage="Wheel link copied"
      copyErrorMessage="Couldn't copy wheel link"
      qrCodeTitle="QR code for wheel invite link"
      footer={
        <>
          Anyone with this link{passcodeEnabled && " and passcode"} can join
          this wheel room.
        </>
      }
    >
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
    </ShareSessionModal>
  );
}
