import { useState, useEffect } from 'react';
import { Building2, Check, LogIn } from 'lucide-react';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { useWorkspaceAuth } from '@/context/WorkspaceAuthContext';
import { useSessionActions } from '@/context/SessionContext';
import { createTeamSession } from '@/lib/workspace-service';
import { cn } from '@/lib/cn';
import { BetaBadge } from '@/components/BetaBadge';

interface SaveToWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomKey: string;
  suggestedName?: string;
}

export function SaveToWorkspaceModal({
  isOpen,
  onClose,
  roomKey,
  suggestedName,
}: SaveToWorkspaceModalProps) {
  const {
    isAuthenticated,
    isLoading: isAuthLoading,
    teams,
  } = useWorkspaceAuth();
  const { goToLogin } = useSessionActions();

  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [sessionName, setSessionName] = useState(suggestedName || '');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSessionName(suggestedName || '');
      setSelectedTeamId(teams.length === 1 ? teams[0].id : null);
      setIsSuccess(false);
      setError(null);
    }
  }, [isOpen, suggestedName, teams]);

  const handleSave = async () => {
    if (!selectedTeamId || !sessionName.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      await createTeamSession(selectedTeamId, sessionName.trim(), roomKey);
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setSessionName('');
        setSelectedTeamId(null);
      }, 1500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save session';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoginClick = () => {
    onClose();
    goToLogin();
  };

  if (!isOpen) return null;

  if (isAuthLoading) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Save to Workspace"
        size="sm"
      >
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      </Modal>
    );
  }

  if (!isAuthenticated) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Save to Workspace"
        size="sm"
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-900/30">
            <Building2 className="h-6 w-6 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="space-y-2">
            <p className="font-medium text-slate-900 dark:text-white">
              Sign in to save this room <BetaBadge />
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Link this planning room to your workspace for easy access later.
            </p>
          </div>
          <Button
            onClick={handleLoginClick}
            icon={<LogIn className="h-4 w-4" />}
            fullWidth
          >
            Sign in to Workspace
          </Button>
        </div>
      </Modal>
    );
  }

  if (isSuccess) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="sm">
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/30">
            <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            Saved to workspace
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Save to Workspace"
      size="md"
    >
      <div className="space-y-5">
        {error && <Alert variant="error">{error}</Alert>}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Select team
          </label>
          {teams.length === 0 ? (
            <SurfaceCard variant="subtle" className="text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No teams yet. Create one in your workspace first.
              </p>
            </SurfaceCard>
          ) : (
            <div className="grid gap-2">
              {teams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => setSelectedTeamId(team.id)}
                  className={cn(
                    'w-full rounded-xl border p-3 text-left transition',
                    selectedTeamId === team.id
                      ? 'border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20'
                      : 'border-white/50 bg-white/70 hover:border-brand-200 dark:border-white/10 dark:bg-slate-900/40 dark:hover:border-brand-800'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-brand-500" />
                    <span className="font-medium text-slate-900 dark:text-white">
                      {team.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <Input
          label="Session name"
          placeholder="Sprint 42 Planning"
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          fullWidth
        />

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Room key
          </label>
          <div className="rounded-xl border border-white/50 bg-white/50 px-4 py-2 font-mono text-sm dark:border-white/10 dark:bg-slate-900/40">
            {roomKey}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            isLoading={isSaving}
            disabled={
              !selectedTeamId || !sessionName.trim() || teams.length === 0
            }
          >
            Save to Workspace
          </Button>
        </div>
      </div>
    </Modal>
  );
}
