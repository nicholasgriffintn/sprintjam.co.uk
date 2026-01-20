import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Key, Lock, User } from 'lucide-react';

import { Footer } from '@/components/layout/Footer';
import { PageSection } from '@/components/layout/PageBackground';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { useSessionActions } from '@/context/SessionContext';
import { navigateTo } from '@/config/routes';
import { joinWheel } from '@/lib/wheel-api-service';
import { USERNAME_STORAGE_KEY } from '@/constants';
import { safeLocalStorage } from '@/utils/storage';
import {
  formatRoomKey,
  validateName,
  validateRoomKey,
} from '@/utils/validators';

export default function JoinWheelScreen() {
  const { setScreen } = useSessionActions();
  const [prefillKey] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('key') || '';
    } catch {
      return '';
    }
  });

  const [name, setName] = useState(
    () => safeLocalStorage.get(USERNAME_STORAGE_KEY) ?? '',
  );
  const [wheelKey, setWheelKey] = useState(prefillKey);
  const [passcode, setPasscode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prefillKey) {
      setWheelKey(formatRoomKey(prefillKey).slice(0, 6));
    }
  }, [prefillKey]);

  const nameValidation = validateName(name);
  const wheelKeyValidation = validateRoomKey(wheelKey);
  const canSubmit = nameValidation.ok && wheelKeyValidation.ok;

  const handleJoin = useCallback(async () => {
    if (!nameValidation.ok) {
      setError(nameValidation.error ?? 'Please enter your name');
      return;
    }

    if (!wheelKeyValidation.ok) {
      setError(wheelKeyValidation.error ?? 'Please enter a valid room code');
      return;
    }

    setIsLoading(true);
    setError(null);

    safeLocalStorage.set(USERNAME_STORAGE_KEY, name.trim());

    try {
      const normalizedKey = formatRoomKey(wheelKey).slice(0, 6);
      await joinWheel(name.trim(), normalizedKey, passcode.trim() || undefined);

      setScreen('wheel');
      navigateTo('wheel', { wheelKey: normalizedKey });
    } finally {
      setIsLoading(false);
    }
  }, [name, nameValidation, wheelKey, wheelKeyValidation, passcode, setScreen]);

  const handleWheelKeyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setWheelKey(formatRoomKey(e.target.value).slice(0, 6));
    },
    [],
  );

  return (
    <PageSection align="start" maxWidth="sm">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        <div className="space-y-3 text-left">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-brand-500">
              Wheel spinner
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
              Join your team wheel
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-300">
              Use the room code shared by your moderator. If the room is locked,
              you will be prompted for the passcode.
            </p>
          </div>
        </div>

        <SurfaceCard>
          <motion.form
            onSubmit={(event) => {
              event.preventDefault();
              void handleJoin();
            }}
            className="space-y-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {error && <Alert variant="error">{error}</Alert>}

            <div className="space-y-6">
              <Input
                id="wheel-join-name"
                label={
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Your name
                  </span>
                }
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Team member name"
                required
                fullWidth
                icon={<User className="h-4 w-4" />}
                showValidation
                isValid={nameValidation.ok}
              />

              <Input
                id="wheel-join-code"
                label={
                  <span className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Room key
                  </span>
                }
                type="text"
                value={wheelKey}
                onChange={handleWheelKeyChange}
                placeholder="0MTINL"
                maxLength={6}
                required
                fullWidth
                icon={<Key className="h-4 w-4" />}
                autoFocus={!!prefillKey}
                disabled={isLoading}
                showValidation={wheelKey.length > 0}
                isValid={wheelKeyValidation.ok}
                helperText="Six characters shared by your moderator."
                className="font-mono tracking-[0.35em]"
              />

              <Input
                id="wheel-join-passcode"
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
                placeholder="Enter passcode if needed"
                fullWidth
                icon={<Lock className="h-4 w-4" />}
              />
            </div>

            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                isLoading={isLoading}
                disabled={!canSubmit}
                fullWidth
              >
                Join wheel room
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setScreen('createWheel');
                  navigateTo('createWheel');
                }}
              >
                Create a new wheel
              </Button>
            </div>
          </motion.form>
        </SurfaceCard>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Need help? Ask your moderator for the key or passcode again.
        </p>
      </motion.div>

      <Footer displayRepoLink={false} />
    </PageSection>
  );
}
