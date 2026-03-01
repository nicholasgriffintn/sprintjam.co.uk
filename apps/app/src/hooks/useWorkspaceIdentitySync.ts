import { useEffect } from "react";

import { useSessionActions } from "@/context/SessionContext";
import { useWorkspaceAuth } from "@/context/WorkspaceAuthContext";
import { sanitiseAvatarValue } from "@/utils/avatars";
import type { AvatarId } from "@/types";

export function useWorkspaceIdentitySync() {
  const { user, isAuthenticated } = useWorkspaceAuth();
  const { setName, setSelectedAvatar } = useSessionActions();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    if (user.name?.trim()) {
      setName(user.name.trim());
    }

    const avatar = sanitiseAvatarValue(user.avatar);
    if (avatar) {
      setSelectedAvatar(avatar as AvatarId);
    }
  }, [isAuthenticated, setName, setSelectedAvatar, user, user?.avatar, user?.name]);
}
