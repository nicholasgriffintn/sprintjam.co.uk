import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TeamSession } from "@sprintjam/types";

import { useWorkspaceAuth } from "@/context/WorkspaceAuthContext";
import { getTeamSessionByRoomKey } from "@/lib/workspace-service";

export const useLinkedWorkspaceSession = (roomKey: string) => {
  const { isAuthenticated, teams } = useWorkspaceAuth();
  const queryClient = useQueryClient();
  const queryKey = ["linked-workspace-session", roomKey] as const;
  const query = useQuery({
    queryKey,
    enabled: isAuthenticated && Boolean(roomKey),
    queryFn: () => getTeamSessionByRoomKey(roomKey),
    staleTime: 0,
  });

  const linkedWorkspaceSession = query.data ?? null;
  const linkedWorkspaceTeamName =
    teams.find((team) => team.id === linkedWorkspaceSession?.teamId)?.name ??
    null;
  const showSaveToWorkspace =
    !isAuthenticated || (!query.isLoading && linkedWorkspaceSession === null);

  const setLinkedWorkspaceSession = (session: TeamSession) => {
    queryClient.setQueryData(queryKey, session);
  };

  return {
    linkedWorkspaceSession,
    linkedWorkspaceTeamName,
    showSaveToWorkspace,
    setLinkedWorkspaceSession,
  };
};
