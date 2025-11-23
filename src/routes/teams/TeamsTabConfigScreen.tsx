import { useEffect, useState } from 'react';
import * as microsoftTeams from '@microsoft/teams-js';
import { useTeamsContext } from '@/hooks/useTeamsContext';

/**
 * Configuration screen shown when adding SprintJam tab to a Teams channel
 * Allows users to create a new room or join an existing one
 */
export default function TeamsTabConfigScreen() {
  const teamsContext = useTeamsContext();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [roomName, setRoomName] = useState('');
  const [roomKey, setRoomKey] = useState('');
  const [isValid, setIsValid] = useState(false);

  // Set default room name based on channel name
  useEffect(() => {
    if (teamsContext.team?.channelName && !roomName) {
      setRoomName(`${teamsContext.team.channelName} Planning`);
    }
  }, [teamsContext.team?.channelName, roomName]);

  // Validate form
  useEffect(() => {
    const valid =
      mode === 'create' ? roomName.trim().length > 0 : roomKey.trim().length > 0;
    setIsValid(valid);
  }, [mode, roomName, roomKey]);

  // Initialize Teams SDK and register save handler
  useEffect(() => {
    if (!teamsContext.isInitialized) {
      return;
    }

    // Set initial validity state
    microsoftTeams.pages.config.setValidityState(isValid);

    // Register save handler
    microsoftTeams.pages.config.registerOnSaveHandler((saveEvent) => {
      // Build the content URL for the tab
      const baseUrl = window.location.origin;
      const params = new URLSearchParams();

      // Add Teams metadata
      if (teamsContext.team) {
        params.set('teamsChannelId', teamsContext.team.channelId || '');
        params.set('teamsTeamId', teamsContext.team.teamId);
        params.set('teamsChannelName', teamsContext.team.channelName || '');
      }

      // Route to create or join based on mode
      const path = mode === 'create' ? '/create' : '/join';

      if (mode === 'create') {
        params.set('roomName', roomName);
      } else {
        params.set('key', roomKey);
      }

      const contentUrl = `${baseUrl}${path}?${params.toString()}`;

      // Configure the tab
      microsoftTeams.pages.config.setConfig({
        suggestedDisplayName:
          mode === 'create' ? roomName : `SprintJam Room ${roomKey}`,
        entityId:
          mode === 'create'
            ? `sprintjam-new-${Date.now()}`
            : `sprintjam-${roomKey}`,
        contentUrl,
        websiteUrl: contentUrl,
      });

      saveEvent.notifySuccess();
    });
  }, [teamsContext, isValid, mode, roomName, roomKey]);

  // Update validity state when form changes
  useEffect(() => {
    if (teamsContext.isInitialized) {
      microsoftTeams.pages.config.setValidityState(isValid);
    }
  }, [isValid, teamsContext.isInitialized]);

  if (!teamsContext.isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-slate-600 dark:text-slate-400">
            Initializing Teams...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-900">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-slate-800">
          <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
            Configure SprintJam
          </h1>
          <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
            Set up a planning poker room for your team
          </p>

          {/* Mode Selection */}
          <div className="mb-6 space-y-3">
            <label className="flex cursor-pointer items-start space-x-3 rounded-lg border-2 border-slate-200 p-4 transition-colors hover:border-blue-300 dark:border-slate-700 dark:hover:border-blue-600">
              <input
                type="radio"
                name="mode"
                checked={mode === 'create'}
                onChange={() => setMode('create')}
                className="mt-1 h-4 w-4 text-blue-600"
              />
              <div className="flex-1">
                <div className="font-semibold text-slate-900 dark:text-white">
                  Create New Room
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Start a fresh planning poker session for this channel
                </div>
              </div>
            </label>

            <label className="flex cursor-pointer items-start space-x-3 rounded-lg border-2 border-slate-200 p-4 transition-colors hover:border-blue-300 dark:border-slate-700 dark:hover:border-blue-600">
              <input
                type="radio"
                name="mode"
                checked={mode === 'join'}
                onChange={() => setMode('join')}
                className="mt-1 h-4 w-4 text-blue-600"
              />
              <div className="flex-1">
                <div className="font-semibold text-slate-900 dark:text-white">
                  Join Existing Room
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Connect to a room that's already been created
                </div>
              </div>
            </label>
          </div>

          {/* Form Fields */}
          {mode === 'create' ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Room Name
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder={`e.g., ${teamsContext.team?.channelName || 'Team'} Planning`}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-500"
                autoFocus
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                This name will help identify your room in SprintJam
              </p>
            </div>
          ) : (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Room Key
              </label>
              <input
                type="text"
                value={roomKey}
                onChange={(e) => setRoomKey(e.target.value.toUpperCase())}
                placeholder="e.g., ABC123"
                maxLength={6}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 font-mono text-lg uppercase text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-500"
                autoFocus
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Enter the 6-character room key shared with you
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <div className="flex">
              <svg
                className="mr-3 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-semibold">How it works</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Team members will automatically join with their Teams identity</li>
                  <li>Real-time voting with live updates</li>
                  <li>Jira and Linear integration available</li>
                  <li>Privacy-focused: no ads, no tracking</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Channel Info */}
        {teamsContext.team && (
          <div className="mt-4 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Channel
            </p>
            <p className="mt-1 text-sm text-slate-900 dark:text-white">
              {teamsContext.team.teamName}
              {teamsContext.team.channelName && (
                <> → {teamsContext.team.channelName}</>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
