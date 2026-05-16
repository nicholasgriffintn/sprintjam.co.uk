import { useMemo, useState, type FormEvent } from "react";
import { ArrowRight, Key, Lock, User } from "lucide-react";
import { motion } from "framer-motion";

import { useAppNavigation } from "@/hooks/useAppNavigation";
import {
  getStoredUserAvatar,
  getStoredUserName,
  persistUserName,
  useUserPersistence,
} from "@/hooks/useUserPersistence";
import { joinRetro } from "@/lib/retro-api-service";
import {
  formatRoomKey,
  validateName,
  validatePasscode,
  validateRoomKey,
} from "@/utils/validators";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { PageSection } from "@/components/layout/PageBackground";
import { Footer } from "@/components/layout/Footer";
import { BetaBadge } from "@/components/BetaBadge";

interface RetroJoinScreenProps {
  initialRetroKey?: string;
}

export function RetroJoinScreen({
  initialRetroKey = "",
}: RetroJoinScreenProps) {
  const navigateTo = useAppNavigation();
  const storedAvatar = useMemo(() => getStoredUserAvatar(), []);
  const [userName, setUserName] = useState(() => getStoredUserName());
  const [retroKey, setRetroKey] = useState(initialRetroKey.toUpperCase());
  const [passcode, setPasscode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useUserPersistence({ name: userName, avatar: storedAvatar });

  const nameValidation = validateName(userName);
  const passcodeValidation = validatePasscode(passcode);
  const normalizedRetroKey = retroKey.trim().toUpperCase();
  const retroKeyValidation = validateRoomKey(normalizedRetroKey);
  const isFormValid =
    nameValidation.ok && passcodeValidation.ok && retroKeyValidation.ok;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const normalizedName = userName.trim();
      const response = await joinRetro(
        normalizedName,
        normalizedRetroKey,
        passcode.trim() || undefined,
        storedAvatar ?? undefined,
      );
      persistUserName(normalizedName);
      navigateTo("retroRoom", { retroKey: response.retro.key });
    } catch (joinError) {
      setIsSubmitting(false);
      setError(
        joinError instanceof Error
          ? joinError.message
          : "Unable to join this retro.",
      );
    }
  };

  return (
    <PageSection align="start" maxWidth="sm">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        <div className="space-y-3 text-left">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm uppercase tracking-[0.35em] text-brand-500">
              Retros
            </p>
            <BetaBadge />
          </div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
            Join Retro
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300">
            Enter the room details and join the team board.
          </p>
        </div>

        <SurfaceCard>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              id="retro-join-name"
              label={
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Your name
                </span>
              }
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              error={nameValidation.ok ? undefined : nameValidation.error}
              placeholder="Team member name"
              required
              icon={<User className="h-4 w-4" />}
              showValidation
              isValid={nameValidation.ok}
              fullWidth
            />
            <Input
              id="retro-join-key"
              label={
                <span className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Retro code
                </span>
              }
              value={retroKey}
              onChange={(event) =>
                setRetroKey(formatRoomKey(event.target.value))
              }
              placeholder="0MTINL"
              maxLength={6}
              required
              icon={<Key className="h-4 w-4" />}
              showValidation
              isValid={retroKeyValidation.ok}
              helperText="Six characters shared by your moderator."
              className="font-mono tracking-[0.35em]"
              fullWidth
            />
            <Input
              id="retro-join-passcode"
              label={
                <span className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Passcode
                  <span className="text-xs font-normal text-slate-400">
                    optional
                  </span>
                </span>
              }
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              error={
                passcodeValidation.ok ? undefined : passcodeValidation.error
              }
              icon={<Lock className="h-4 w-4" />}
              placeholder="Enter passcode if needed"
              fullWidth
            />
            {error ? <Alert variant="warning">{error}</Alert> : null}
            <Button
              type="submit"
              fullWidth
              disabled={!isFormValid || isSubmitting}
              isLoading={isSubmitting}
              icon={<ArrowRight className="h-4 w-4" />}
            >
              Join retro
            </Button>
          </form>
        </SurfaceCard>
      </motion.div>
      <Footer displayRepoLink={false} />
    </PageSection>
  );
}
