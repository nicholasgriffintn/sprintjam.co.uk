import type { ReactNode } from "react";

import { AppNavBar } from "./AppNavBar";
import { useWorkspaceAuth } from "@/context/WorkspaceAuthContext";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isAuthenticated } = useWorkspaceAuth();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {isAuthenticated && <AppNavBar />}
      <main>{children}</main>
    </div>
  );
}
