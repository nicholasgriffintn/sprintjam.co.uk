import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';

import AvatarSelector from '@/components/AvatarSelector';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { toast } from '@/components/ui';
import { useSessionActions } from '@/context/SessionContext';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import { META_CONFIGS } from '@/config/meta';
import { usePageMeta } from '@/hooks/usePageMeta';
import { updateCurrentUserProfile } from '@/lib/workspace-service';
import { isAvatarUrl, sanitiseAvatarValue } from '@/utils/avatars';
import { validateName } from '@/utils/validators';
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';

const DEFAULT_PROFILE_AVATAR = 'user';

export default function WorkspaceProfile() {
  usePageMeta(META_CONFIGS.workspaceProfile);

  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    actionError,
    refreshWorkspace,
  } = useWorkspaceData();
  const { goToLogin } = useSessionActions();

  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_PROFILE_AVATAR);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    const avatar = sanitiseAvatarValue(user.avatar);

    setName(user.name ?? '');
    setSelectedAvatar(
      avatar && !isAvatarUrl(avatar) ? avatar : DEFAULT_PROFILE_AVATAR,
    );
    setCustomImageUrl(isAvatarUrl(avatar) ? avatar : '');
  }, [user]);

  const trimmedName = name.trim();
  const trimmedCustomImageUrl = customImageUrl.trim();
  const isNameValid = validateName(trimmedName).ok;
  const isDirty = useMemo(() => {
    if (!user) {
      return false;
    }

    return (
      trimmedName !== (user.name ?? '') ||
      (trimmedCustomImageUrl || selectedAvatar) !==
        (user.avatar ?? DEFAULT_PROFILE_AVATAR)
    );
  }, [selectedAvatar, trimmedCustomImageUrl, trimmedName, user]);

  const handleSave = async () => {
    if (!isNameValid) {
      setLocalError('Profile name is required');
      return;
    }

    if (trimmedCustomImageUrl) {
      let parsed: URL;
      try {
        parsed = new URL(trimmedCustomImageUrl);
      } catch {
        setLocalError('Custom image URL must be a valid URL');
        return;
      }

      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setLocalError('Custom image URL must start with http:// or https://');
        return;
      }
    }

    setIsSaving(true);
    setLocalError(null);

    try {
      await updateCurrentUserProfile({
        name: trimmedName,
        avatar: trimmedCustomImageUrl || selectedAvatar,
      });
      await refreshWorkspace(true);
      toast.success('Profile updated');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to update profile';
      setLocalError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const isAvatarSelectionDisabled = Boolean(isAvatarUrl(user?.avatar));

  return (
    <WorkspaceLayout
      isLoading={isLoading}
      isAuthenticated={isAuthenticated}
      user={user}
      error={error}
      onRefresh={() => refreshWorkspace(true)}
      onLogin={goToLogin}
    >
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">
            Profile
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Set the identity SprintJam should use when you create or join rooms.
          </p>
        </div>

        {actionError && <Alert variant="warning">{actionError}</Alert>}
        {localError && <Alert variant="error">{localError}</Alert>}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <SurfaceCard className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Room identity
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                If an image URL is set, it overrides your selected avatar
                everywhere.
              </p>
            </div>

            <Input
              label="Display name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              fullWidth
              required
              showValidation
              isValid={isNameValid}
            />

            {!isAvatarSelectionDisabled && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Avatar
                  </p>
                </div>
                <AvatarSelector
                  selectedAvatar={selectedAvatar}
                  onSelectAvatar={setSelectedAvatar}
                  disabled={isAvatarSelectionDisabled}
                />
              </div>
            )}

            <Input
              label="Custom image URL"
              value={customImageUrl}
              onChange={(event) => setCustomImageUrl(event.target.value)}
              placeholder="https://example.com/avatar.png"
              helperText="Optional. Public HTTP or HTTPS image URL."
              fullWidth
            />

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                isLoading={isSaving}
                disabled={!user || !isDirty || !isNameValid}
                icon={<Save className="h-4 w-4" />}
              >
                Save profile
              </Button>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
