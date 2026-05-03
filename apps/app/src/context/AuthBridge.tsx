import { use, type ReactNode } from "react";
import type { WorkspaceAuthProfile } from "@sprintjam/types";

import { WorkspaceAuthProvider } from "@/context/WorkspaceAuthContext";

export function AuthBridge({
  profilePromise,
  children,
}: {
  profilePromise: Promise<WorkspaceAuthProfile | null>;
  children: ReactNode;
}) {
  const profile = use(profilePromise);
  return (
    <WorkspaceAuthProvider initialProfile={profile}>
      {children}
    </WorkspaceAuthProvider>
  );
}
