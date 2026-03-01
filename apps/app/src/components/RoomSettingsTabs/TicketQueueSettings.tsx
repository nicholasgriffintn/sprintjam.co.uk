import type { RoomSettings, JudgeAlgorithm } from '@/types';
import { useTeamOAuth } from '@/hooks/useTeamOAuth';
import { useRoomState } from '@/context/RoomContext';
import { useSessionState } from '@/context/SessionContext';
import { BetaBadge } from '@/components/BetaBadge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TeamIntegrationBanner } from './TeamIntegrationBanner';

export function TicketQueueSettings({
  localSettings,
  handleChange,
  isCreating = false,
}: {
  localSettings: RoomSettings;
  handleChange: (
    key: keyof RoomSettings,
    value:
      | boolean
      | (string | number)[]
      | JudgeAlgorithm
      | number
      | string
      | null,
  ) => void;
  isCreating?: boolean;
}) {
  const { roomData } = useRoomState();
  const { selectedWorkspaceTeamId } = useSessionState();
  const teamId = isCreating
    ? selectedWorkspaceTeamId
    : (roomData?.teamId ?? null);

  const { status: teamJiraStatus, loading: jiraLoading } = useTeamOAuth(
    teamId,
    'jira',
  );
  const { status: teamLinearStatus, loading: linearLoading } = useTeamOAuth(
    teamId,
    'linear',
  );
  const { status: teamGithubStatus, loading: githubLoading } = useTeamOAuth(
    teamId,
    'github',
  );

  const autoSyncEnabled = localSettings.autoSyncEstimates ?? true;
  const handleAutoSyncToggle = (checked: boolean) => {
    handleChange('autoSyncEstimates', checked);
  };
  const externalServiceOptions = [
    { label: 'None', value: 'none' },
    { label: 'Jira', value: 'jira' },
    { label: 'Linear', value: 'linear' },
    { label: 'GitHub', value: 'github' },
  ];

  const renderAutoSyncToggle = (
    provider: 'jira' | 'linear',
    connected: boolean,
  ) => {
    if (!connected) return null;
    const providerLabel = provider === 'jira' ? 'Jira' : 'Linear';

    return (
      <div className="flex items-center pt-3">
        <input
          type="checkbox"
          id="autoSyncEstimates"
          checked={autoSyncEnabled}
          onChange={(e) => handleAutoSyncToggle(e.target.checked)}
          data-testid="settings-toggle-auto-sync"
          className="h-4 w-4 rounded border-white/50 text-brand-600 focus:ring-brand-500 dark:border-white/10"
        />
        <label
          htmlFor="autoSyncEstimates"
          className="ml-2 text-sm text-slate-700 dark:text-slate-300"
        >
          Auto-sync estimates to {providerLabel} when voting completes
        </label>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          Ticket Queue <BetaBadge />
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="enableTicketQueue"
            checked={localSettings.enableTicketQueue ?? false}
            onChange={(e) =>
              handleChange('enableTicketQueue', e.target.checked)
            }
            data-testid="settings-toggle-enable-queue"
            className="h-4 w-4 rounded border-white/50 text-brand-600 focus:ring-brand-500 dark:border-white/10"
          />
          <label
            htmlFor="enableTicketQueue"
            className="ml-2 text-sm text-slate-700 dark:text-slate-300"
          >
            Enable ticket queue
          </label>
        </div>
        <p className="ml-6 text-xs text-slate-500 dark:text-slate-400">
          Keep track of tickets in a shared queue and move through them in
          order.
        </p>
      </div>

      {localSettings.enableTicketQueue && (
        <div className="flex items-center">
          <input
            type="checkbox"
            id="allowOthersToManageQueue"
            checked={localSettings.allowOthersToManageQueue ?? false}
            onChange={(e) =>
              handleChange('allowOthersToManageQueue', e.target.checked)
            }
            data-testid="settings-toggle-allow-queue"
            className="h-4 w-4 rounded border-white/50 text-brand-600 focus:ring-brand-500 dark:border-white/10"
          />
          <label
            htmlFor="allowOthersToManageQueue"
            className="ml-2 text-sm text-slate-700 dark:text-slate-300"
          >
            Allow others to manage ticket queue
          </label>
        </div>
      )}

      {localSettings.enableTicketQueue && (
        <div className="space-y-2">
          <Input
            type="number"
            label="Sprint capacity (points)"
            placeholder="40"
            min={0}
            value={
              localSettings.capacityPoints === null ||
              localSettings.capacityPoints === undefined
                ? ''
                : String(localSettings.capacityPoints)
            }
            onChange={(event) => {
              const next = event.target.value;
              handleChange('capacityPoints', next === '' ? null : Number(next));
            }}
            fullWidth
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Optional. Track estimated points against sprint capacity.
          </p>
        </div>
      )}

      {localSettings.enableTicketQueue && (
        <div className="pt-2">
          <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            External Integration
          </h3>
          <div className="space-y-3">
            <label
              htmlFor="externalService"
              className="text-sm text-slate-700 dark:text-slate-300"
            >
              Provider
            </label>
            <Select
              id="externalService"
              value={localSettings.externalService || 'none'}
              onValueChange={(value) => handleChange('externalService', value)}
              data-testid="settings-select-external-service"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              options={externalServiceOptions}
            />

            {!teamId && localSettings.externalService !== 'none' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800/50 dark:bg-amber-900/20">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Integrations require a workspace team. Select a team when
                  creating the room, or sign in to configure one in workspace
                  settings.
                </p>
              </div>
            )}

            {localSettings.externalService === 'jira' && teamId && (
              <div className="space-y-3">
                <TeamIntegrationBanner
                  label="Jira"
                  connected={teamJiraStatus.connected ?? false}
                  loading={jiraLoading}
                />
                {renderAutoSyncToggle('jira', !!teamJiraStatus.connected)}
              </div>
            )}

            {localSettings.externalService === 'linear' && teamId && (
              <div className="space-y-3">
                <TeamIntegrationBanner
                  label="Linear"
                  connected={teamLinearStatus.connected ?? false}
                  loading={linearLoading}
                />
                {renderAutoSyncToggle(
                  'linear',
                  teamLinearStatus.connected ?? false,
                )}
              </div>
            )}

            {localSettings.externalService === 'github' && teamId && (
              <div className="space-y-3">
                <TeamIntegrationBanner
                  label="GitHub"
                  connected={teamGithubStatus.connected ?? false}
                  loading={githubLoading}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
