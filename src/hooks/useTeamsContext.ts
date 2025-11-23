import { useEffect, useState } from 'react';
import * as microsoftTeams from '@microsoft/teams-js';
import type { app } from '@microsoft/teams-js';

export interface TeamsContext {
  isInTeams: boolean;
  isInitialized: boolean;
  user?: {
    id: string;
    displayName?: string;
    userPrincipalName?: string;
    email?: string;
  };
  team?: {
    teamId: string;
    teamName: string;
    channelId?: string;
    channelName?: string;
    groupId?: string;
  };
  meeting?: {
    id: string;
  };
  theme?: 'default' | 'dark' | 'contrast';
  locale?: string;
  appSessionId?: string;
  frameContext?: string;
}

/**
 * Hook to detect and interact with Microsoft Teams context
 * Provides user identity, team/channel information, and theme preferences
 */
export function useTeamsContext(): TeamsContext {
  const [context, setContext] = useState<TeamsContext>({
    isInTeams: false,
    isInitialized: false,
  });

  useEffect(() => {
    let isMounted = true;

    async function initializeTeams() {
      try {
        // Check if we're in a Teams context by attempting to initialize
        await microsoftTeams.app.initialize();

        if (!isMounted) return;

        // Get the Teams context
        const teamsContext = await microsoftTeams.app.getContext();

        if (!isMounted) return;

        // Extract relevant information
        const newContext: TeamsContext = {
          isInTeams: true,
          isInitialized: true,
          user: teamsContext.user
            ? {
                id: teamsContext.user.id,
                displayName: teamsContext.user.displayName,
                userPrincipalName: teamsContext.user.userPrincipalName,
                email: teamsContext.user.loginHint,
              }
            : undefined,
          team:
            teamsContext.team || teamsContext.channel
              ? {
                  teamId: teamsContext.team?.internalId || '',
                  teamName: teamsContext.team?.displayName || '',
                  channelId: teamsContext.channel?.id,
                  channelName: teamsContext.channel?.displayName,
                  groupId: teamsContext.team?.groupId,
                }
              : undefined,
          meeting: teamsContext.meeting
            ? {
                id: teamsContext.meeting.id,
              }
            : undefined,
          theme: teamsContext.app.theme as 'default' | 'dark' | 'contrast',
          locale: teamsContext.app.locale,
          appSessionId: teamsContext.app.sessionId,
          frameContext: teamsContext.page.frameContext,
        };

        setContext(newContext);

        // Listen for theme changes
        microsoftTeams.app.registerOnThemeChangeHandler((theme) => {
          if (!isMounted) return;
          setContext((prev) => ({
            ...prev,
            theme: theme as 'default' | 'dark' | 'contrast',
          }));
        });
      } catch (error) {
        // Not in Teams context or initialization failed
        if (!isMounted) return;
        console.info('Not running in Microsoft Teams context');
        setContext({
          isInTeams: false,
          isInitialized: true,
        });
      }
    }

    initializeTeams();

    return () => {
      isMounted = false;
    };
  }, []);

  return context;
}

/**
 * Helper hook to get a default username from Teams context
 * Returns the display name or email prefix
 */
export function useTeamsUsername(): string {
  const context = useTeamsContext();

  if (!context.isInTeams || !context.user) {
    return '';
  }

  // Priority: display name > email prefix > user principal name prefix
  if (context.user.displayName) {
    return context.user.displayName;
  }

  if (context.user.email) {
    return context.user.email.split('@')[0];
  }

  if (context.user.userPrincipalName) {
    return context.user.userPrincipalName.split('@')[0];
  }

  return '';
}

/**
 * Helper hook to check if we're in a channel tab
 */
export function useIsChannelTab(): boolean {
  const context = useTeamsContext();
  return context.frameContext === 'content' && !!context.team?.channelId;
}

/**
 * Helper hook to check if we're in a meeting
 */
export function useIsInMeeting(): boolean {
  const context = useTeamsContext();
  return !!context.meeting;
}

/**
 * Helper to notify Teams that the app is ready
 * Call this after your app has finished loading
 */
export function notifyTeamsAppLoaded() {
  try {
    microsoftTeams.app.notifySuccess();
  } catch (error) {
    console.info('Not in Teams context, skipping notifySuccess');
  }
}

/**
 * Helper to notify Teams of an error
 */
export function notifyTeamsAppError(message: string) {
  try {
    microsoftTeams.app.notifyFailure({
      reason: microsoftTeams.app.FailedReason.Other,
      message,
    });
  } catch (error) {
    console.error('Failed to notify Teams of error:', message);
  }
}

/**
 * Type guard to check if Teams context has team information
 */
export function hasTeamContext(
  context: TeamsContext
): context is TeamsContext & { team: NonNullable<TeamsContext['team']> } {
  return context.isInTeams && !!context.team;
}
