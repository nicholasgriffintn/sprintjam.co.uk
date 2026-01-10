import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="bg-slate-50 dark:bg-slate-950">
      <main>{children}</main>
    </div>
  );
}
