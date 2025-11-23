import { useEffect, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { useRoom } from '@/context/RoomContext';
import {
  useTeamsContext,
  useTeamsUsername,
  notifyTeamsAppLoaded,
  notifyTeamsAppError,
} from '@/hooks/useTeamsContext';
import { ScreenLoader } from '@/components/layout/ScreenLoader';
import ErrorBanner from '@/components/ui/ErrorBanner';

/**
 * Teams-aware room screen that handles:
 * - Creating rooms from Teams context
 * - Joining existing rooms
 * - Auto-populating user identity from Teams
 * - Linking room to Teams channel metadata
 */
export default function TeamsRoomScreen() {
  const teamsContext = useTeamsContext();
  const teamsUsername = useTeamsUsername();
  const { setName, setScreen, setRoomKey, name } = useSession();
  const { createRoom, joinRoom } = useRoom();
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamsContext.isInitialized) {
      return;
    }

    async function initializeRoom() {
      try {
        // Parse URL parameters
        const params = new URLSearchParams(window.location.search);
        const shouldCreateRoom = params.get('createRoom') === 'true';
        const roomName = params.get('roomName');
        const roomKey = params.get('roomKey');
        const teamsChannelId = params.get('teamsChannelId');
        const teamsTeamId = params.get('teamsTeamId');
        const teamsChannelName = params.get('teamsChannelName');

        // Set user name from Teams context if not already set
        if (!name && teamsUsername) {
          setName(teamsUsername);
        }

        // Prepare Teams metadata for room
        const teamsMetadata =
          teamsChannelId && teamsTeamId
            ? {
                channelId: teamsChannelId,
                teamId: teamsTeamId,
                channelName: teamsChannelName || undefined,
              }
            : undefined;

        if (shouldCreateRoom && roomName) {
          // Create new room
          await createRoom({
            name: teamsUsername || 'Teams User',
            roomName,
            teamsMetadata,
          });
          setScreen('room');
        } else if (roomKey) {
          // Join existing room
          setRoomKey(roomKey);
          await joinRoom({
            name: teamsUsername || 'Teams User',
            roomKey,
            passcode: '', // Teams rooms typically don't have passcodes
          });
          setScreen('room');
        } else {
          throw new Error('Invalid room configuration');
        }

        // Notify Teams that app loaded successfully
        notifyTeamsAppLoaded();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to initialize room';
        setError(errorMessage);
        notifyTeamsAppError(errorMessage);
      } finally {
        setIsInitializing(false);
      }
    }

    initializeRoom();
  }, [
    teamsContext.isInitialized,
    teamsUsername,
    name,
    setName,
    setScreen,
    setRoomKey,
    createRoom,
    joinRoom,
  ]);

  if (!teamsContext.isInitialized || isInitializing) {
    return (
      <ScreenLoader
        title="Loading SprintJam"
        subtitle="Setting up your room..."
      />
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-full max-w-md">
          <ErrorBanner
            message={error}
            onClose={() => {
              setError(null);
              window.location.reload();
            }}
          />
          <div className="mt-4 text-center">
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // The actual RoomScreen will be rendered by App.tsx when screen === 'room'
  return null;
}
