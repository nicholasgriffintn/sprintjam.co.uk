import { useState, useEffect } from 'react';
import { useRoom } from '../context/RoomContext';
import { useSession } from '../context/SessionContext';

interface JiraOAuthStatus {
  connected: boolean;
  jiraDomain?: string;
  jiraUserEmail?: string;
  expiresAt?: number;
}

export function useJiraOAuth() {
  const { activeRoomKey, authToken } = useRoom();
  const { name } = useSession();
  const [status, setStatus] = useState<JiraOAuthStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    if (!activeRoomKey || !name || !authToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `/api/jira/oauth/status?roomKey=${encodeURIComponent(activeRoomKey)}&userName=${encodeURIComponent(name)}&sessionToken=${encodeURIComponent(authToken)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch OAuth status');
      }

      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching Jira OAuth status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [activeRoomKey, name, authToken]);

  const connect = async () => {
    if (!activeRoomKey || !name || !authToken) {
      setError('Missing room key, user name, or session token');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/jira/oauth/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomKey: activeRoomKey,
          userName: name,
          sessionToken: authToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate OAuth');
      }

      const { authorizationUrl } = await response.json();

      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const authWindow = window.open(
        authorizationUrl,
        'Jira OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      const pollTimer = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(pollTimer);
          setTimeout(fetchStatus, 1000);
        }
      }, 500);
    } catch (err) {
      console.error('Error connecting to Jira:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    if (!activeRoomKey || !name || !authToken) {
      setError('Missing room key, user name, or session token');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/jira/oauth/revoke', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomKey: activeRoomKey,
          userName: name,
          sessionToken: authToken
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disconnect Jira');
      }

      setStatus({ connected: false });
    } catch (err) {
      console.error('Error disconnecting from Jira:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return {
    status,
    loading,
    error,
    connect,
    disconnect,
    refresh: fetchStatus,
  };
}
