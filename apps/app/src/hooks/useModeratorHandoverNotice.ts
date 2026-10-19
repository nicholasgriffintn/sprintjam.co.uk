import { useEffect } from "react";

import { toast } from "@/components/ui";
import { addEventListener, removeEventListener } from "@/lib/api-service";
import type { WebSocketMessage } from "@/types";

const MODERATOR_HANDOVER_TOAST_ID = "moderator-handover";

export function useModeratorHandoverNotice(userName: string) {
  useEffect(() => {
    const handlePending = (message: WebSocketMessage) => {
      if (message.type !== "moderatorHandoverPending") {
        return;
      }

      const remainingMs = Math.max(0, message.handoverAt - Date.now());
      const seconds = Math.ceil(remainingMs / 1000);

      toast.close(MODERATOR_HANDOVER_TOAST_ID);
      toast.warning({
        id: MODERATOR_HANDOVER_TOAST_ID,
        title: `${message.moderator} disconnected`,
        description: `Moderator controls will pass to another participant in ${seconds}s unless they reconnect.`,
        timeout: remainingMs,
      });
    };

    const handleCancelled = (message: WebSocketMessage) => {
      if (message.type !== "moderatorHandoverCancelled") {
        return;
      }

      toast.close(MODERATOR_HANDOVER_TOAST_ID);
      toast.success(
        `${message.moderator} reconnected and is still moderating.`,
      );
    };

    const handleNewModerator = (message: WebSocketMessage) => {
      if (message.type !== "newModerator") {
        return;
      }

      toast.close(MODERATOR_HANDOVER_TOAST_ID);
      toast.info(
        message.moderator === userName
          ? "You are now the moderator."
          : `${message.moderator} is now the moderator.`,
      );
    };

    addEventListener("moderatorHandoverPending", handlePending);
    addEventListener("moderatorHandoverCancelled", handleCancelled);
    addEventListener("newModerator", handleNewModerator);

    return () => {
      removeEventListener("moderatorHandoverPending", handlePending);
      removeEventListener("moderatorHandoverCancelled", handleCancelled);
      removeEventListener("newModerator", handleNewModerator);
    };
  }, [userName]);
}
