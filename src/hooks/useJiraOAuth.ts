import { useState, useEffect } from 'react';
import { useRoom } from '../context/RoomContext';
import { useSession } from '../context/SessionContext';

interface JiraOAuthStatus {
  connected: boolean;
  jiraDomain?: string;
  jiraUserEmail?: string;
  expiresAt?: number;
  storyPointsField?: string | null;
  sprintField?: string | null;
}

interface JiraFieldOption {
  id: string;
  name: string;
  type?: string | null;
  custom?: boolean;
}

export function useJiraOAuth() {
  const { activeRoomKey, authToken } = useRoom();
  const { name } = useSession();
  const [status, setStatus] = useState<JiraOAuthStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<JiraFieldOption[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [fieldsLoaded, setFieldsLoaded] = useState(false);
  const [savingFields, setSavingFields] = useState(false);

  const fetchStatus = async () => {
    if (!activeRoomKey || !name || !authToken) {
      setLoading(false);
      setFields([]);
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
      setFieldsLoaded(false);
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
    setFields([]);
    setFieldsLoaded(false);
  }, [activeRoomKey, name, authToken]);

  useEffect(() => {
    if (status.connected && !fieldsLoaded && !fieldsLoading) {
      void fetchFields();
    }
  }, [status.connected, fieldsLoaded, fieldsLoading]);

  const fetchFields = async () => {
    if (!activeRoomKey || !name || !authToken) {
      return;
    }
    try {
      setFieldsLoading(true);
      const response = await fetch(
        `/api/jira/oauth/fields?roomKey=${encodeURIComponent(
          activeRoomKey
        )}&userName=${encodeURIComponent(name)}&sessionToken=${encodeURIComponent(
          authToken
        )}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || 'Failed to fetch Jira fields'
        );
      }

      const data = (await response.json()) as {
        fields: JiraFieldOption[];
        storyPointsField?: string | null;
        sprintField?: string | null;
      };

      setFields(data.fields || []);
      setStatus((prev) => ({
        ...prev,
        storyPointsField:
          data.storyPointsField !== undefined
            ? data.storyPointsField
            : prev.storyPointsField,
        sprintField:
          data.sprintField !== undefined
            ? data.sprintField
            : prev.sprintField,
      }));
      setFieldsLoaded(true);
      setError(null);
    } catch (err) {
      console.error('Error fetching Jira fields:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setFieldsLoading(false);
    }
  };

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

  const saveFieldConfiguration = async (options: {
    storyPointsField?: string | null;
    sprintField?: string | null;
  }) => {
    if (!activeRoomKey || !name || !authToken) {
      setError('Missing room key, user name, or session token');
      return;
    }

    try {
      setSavingFields(true);
      setError(null);

      const response = await fetch('/api/jira/oauth/fields', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomKey: activeRoomKey,
          userName: name,
          sessionToken: authToken,
          storyPointsField: options.storyPointsField,
          sprintField: options.sprintField,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save Jira field settings');
      }

      setStatus((prev) => ({
        ...prev,
        storyPointsField:
          options.storyPointsField !== undefined
            ? options.storyPointsField
            : prev.storyPointsField,
        sprintField:
          options.sprintField !== undefined
            ? options.sprintField
            : prev.sprintField,
      }));
    } catch (err) {
      console.error('Error saving Jira field configuration:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSavingFields(false);
    }
  };

  return {
    status,
    loading,
    error,
    connect,
    disconnect,
    refresh: fetchStatus,
    fields,
    fieldsLoading,
    fieldsLoaded,
    fetchFields,
    saveFieldConfiguration,
    savingFields,
  };
}
