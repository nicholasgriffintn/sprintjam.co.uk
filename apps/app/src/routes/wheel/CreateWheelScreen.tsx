import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Key, Sparkles, User } from 'lucide-react';

import { Footer } from '@/components/layout/Footer';
import { PageSection } from '@/components/layout/PageBackground';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { useSessionActions } from '@/context/SessionContext';
import { navigateTo } from '@/config/routes';
import { createWheel } from '@/lib/wheel-api-service';
import { USERNAME_STORAGE_KEY } from '@/constants';
import { safeLocalStorage } from '@/utils/storage';
import { validateName, validatePasscode } from '@/utils/validators';

export default function CreateWheelScreen() {
  const { setScreen } = useSessionActions();
  const [name, setName] = useState(
    () => safeLocalStorage.get(USERNAME_STORAGE_KEY) ?? '',
  );
  const [passcode, setPasscode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameValidation = validateName(name);
  const passcodeValidation = validatePasscode(passcode);
  const canSubmit = nameValidation.ok && passcodeValidation.ok;

  const handleCreate = useCallback(async () => {
    if (!nameValidation.ok) {
      setError(nameValidation.error ?? 'Please enter your name');
      return;
    }
    if (!passcodeValidation.ok) {
      setError(passcodeValidation.error ?? 'Please check the passcode');
      return;
    }

    setIsLoading(true);
    setError(null);

    safeLocalStorage.set(USERNAME_STORAGE_KEY, name.trim());

    try {
      const response = await createWheel(
        name.trim(),
        passcode.trim() || undefined,
      );

      setScreen('wheel');
      navigateTo('wheel', { wheelKey: response.wheel.key });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create wheel room',
      );
    } finally {
      setIsLoading(false);
    }
  }, [name, nameValidation, passcode, passcodeValidation, setScreen]);

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
              Create a wheel room
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-300">
              Add names, spin the wheel, and keep every stand-up or retro moving
              fast. Share the code with your team when you are ready.
            </p>
          </div>
        </div>

        <SurfaceCard>
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreate();
            }}
          >
            <Input
              id="wheel-create-name"
              label="Your name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Moderator name"
              icon={<User className="h-4 w-4" />}
              fullWidth
              autoFocus
              disabled={isLoading}
              showValidation={name.length > 0}
              isValid={nameValidation.ok}
              error={
                name.length > 0 && !nameValidation.ok
                  ? nameValidation.error
                  : undefined
              }
            />

            <Input
              id="wheel-create-passcode"
              label="Passcode (optional)"
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              placeholder="Add a room passcode"
              helperText="Leave this empty if you want an open room."
              fullWidth
              disabled={isLoading}
              error={
                passcode.length > 0 && !passcodeValidation.ok
                  ? passcodeValidation.error
                  : undefined
              }
            />

            {error && <Alert variant="error">{error}</Alert>}

            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                isLoading={isLoading}
                disabled={!canSubmit}
                fullWidth
              >
                Create wheel room
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setScreen('joinWheel');
                  navigateTo('joinWheel');
                }}
              >
                Join with a code
              </Button>
            </div>
          </form>
        </SurfaceCard>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          After creation you'll be directed to the wheel room to start adding
          names.
        </p>
      </motion.div>
      <Footer displayRepoLink={false} />
    </PageSection>
  );
}
