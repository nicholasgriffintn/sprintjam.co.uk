import { useMemo } from 'react';
import { AlertCircle, CheckCircle2, Plug2 } from 'lucide-react';

import { useJiraOAuth } from '@/hooks/useJiraOAuth';
import { useLinearOAuth } from '@/hooks/useLinearOAuth';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface QueueProviderSetupModalProps {
  isOpen: boolean;
  provider: 'jira' | 'linear';
  onClose: () => void;
  onOpenQueue: () => void;
}

export function QueueProviderSetupModal({
  isOpen,
  provider,
  onClose,
  onOpenQueue,
}: QueueProviderSetupModalProps) {
  const jira = useJiraOAuth(provider === 'jira');
  const linear = useLinearOAuth(provider === 'linear');

  const isJira = provider === 'jira';
  const authState = isJira ? jira : linear;
  const connected = authState.status.connected;
  const loading = authState.loading;
  const error = authState.error;

  const copy = useMemo(
    () =>
      isJira
        ? {
          name: 'Jira',
          description:
            'Pull tickets directly from your Jira backlog and keep estimates in sync.',
        }
        : {
          name: 'Linear',
          description:
            'Connect Linear to queue up issues and capture estimates alongside your cycle.',
        },
    [isJira]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Connect your queue"
      size="md"
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-sm shadow-sm dark:border-slate-800/80 dark:bg-slate-900/70">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-100">
              <Plug2 className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-slate-900 dark:text-white">
                Configure {copy.name}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {copy.description}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800/80 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Connection status
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  We’ll ask you to sign in so SprintJam can read your tickets
                  and write estimates.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow-sm dark:bg-slate-800/80 dark:text-slate-200">
                {connected ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Connected
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    Disconnected
                  </>
                )}
              </div>
            </div>

            {error && (
              <p className="mt-3 text-xs text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={connected ? authState.disconnect : authState.connect}
                disabled={loading}
                fullWidth
              >
                {connected ? 'Disconnect' : `Connect to ${copy.name}`}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-300/80 bg-white/60 p-4 text-sm dark:border-slate-800/80 dark:bg-slate-900/60">
          <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Set up your queue
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Once connected, add the tickets you want to point. We’ll start with
            an empty queue so you can choose what matters.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => {
                onOpenQueue();
                onClose();
              }}
              disabled={!connected}
              fullWidth
              variant="primary"
            >
              Open queue setup
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
