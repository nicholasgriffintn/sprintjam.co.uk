import { useState } from 'react';
import { useRoomContext } from '@/context/RoomContext';
import { useSessionContext } from '@/context/SessionContext';

export function RoomMetadata() {
  const { roomData, authToken } = useRoomContext();
  const { userName } = useSessionContext();
  const [workspaceId, setWorkspaceId] = useState(roomData?.workspaceId || '');
  const [team, setTeam] = useState(roomData?.team || '');
  const [persona, setPersona] = useState(roomData?.persona || '');
  const [sprintId, setSprintId] = useState(roomData?.sprintId || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>(
    'idle'
  );

  const handleSave = async () => {
    if (!roomData || !userName || !authToken) return;

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const response = await fetch(`/api/rooms/${roomData.key}/metadata`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: userName,
          sessionToken: authToken,
          workspaceId: workspaceId || undefined,
          team: team || undefined,
          persona: persona || undefined,
          sprintId: sprintId || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update metadata');
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error updating metadata:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    workspaceId !== (roomData?.workspaceId || '') ||
    team !== (roomData?.team || '') ||
    persona !== (roomData?.persona || '') ||
    sprintId !== (roomData?.sprintId || '');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
          Room Metadata
        </h3>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Organize your planning sessions with metadata tags to enable better
          filtering and trend analysis in the voting history.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="workspaceId"
            className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Workspace ID
          </label>
          <input
            type="text"
            id="workspaceId"
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            placeholder="e.g., engineering-team"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-blue-400"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Group rooms by workspace for cross-room analytics
          </p>
        </div>

        <div>
          <label
            htmlFor="team"
            className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Team
          </label>
          <input
            type="text"
            id="team"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            placeholder="e.g., Backend Team"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-blue-400"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Track which team is voting for better cohort analysis
          </p>
        </div>

        <div>
          <label
            htmlFor="persona"
            className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Persona
          </label>
          <input
            type="text"
            id="persona"
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            placeholder="e.g., Developer, Designer, QA"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-blue-400"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Filter voting patterns by role or persona
          </p>
        </div>

        <div>
          <label
            htmlFor="sprintId"
            className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Sprint ID
          </label>
          <input
            type="text"
            id="sprintId"
            value={sprintId}
            onChange={(e) => setSprintId(e.target.value)}
            placeholder="e.g., Sprint 23, Q1-2024"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-blue-400"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Compare voting trends across sprints
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            hasChanges && !isSaving
              ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:bg-blue-500 dark:hover:bg-blue-600'
              : 'cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
          }`}
        >
          {isSaving ? 'Saving...' : 'Save Metadata'}
        </button>

        {saveStatus === 'success' && (
          <span className="text-sm text-green-600 dark:text-green-400">
            ✓ Saved successfully
          </span>
        )}

        {saveStatus === 'error' && (
          <span className="text-sm text-red-600 dark:text-red-400">
            ✗ Failed to save
          </span>
        )}
      </div>

      <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <div className="flex items-start gap-3">
          <svg
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400"
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
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <strong className="font-semibold">Pro Tip:</strong> Use consistent
            naming across rooms to enable powerful cross-room analytics and trend
            analysis in your voting history.
          </div>
        </div>
      </div>
    </div>
  );
}
