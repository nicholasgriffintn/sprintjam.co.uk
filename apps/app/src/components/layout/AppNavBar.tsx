import { LayoutGrid, LogOut, Plus } from "lucide-react";

import { useSessionActions, useSessionState } from "@/context/SessionContext";
import { useWorkspaceAuth } from "@/context/WorkspaceAuthContext";
import { Button } from "@/components/ui/Button";
import DarkModeToggle from "@/components/Header/DarkModeToggle";
import { cn } from "@/lib/cn";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  screen: string;
  onClick: () => void;
}

export function AppNavBar() {
  const { screen } = useSessionState();
  const { goToWorkspace, startCreateFlow, goHome } = useSessionActions();
  const { user, logout } = useWorkspaceAuth();

  const navItems: NavItem[] = [
    {
      icon: <LayoutGrid className="h-4 w-4" />,
      label: "Dashboard",
      screen: "workspace",
      onClick: goToWorkspace,
    },
  ];

  const handleLogout = async () => {
    await logout();
    goHome();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/50 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              goHome();
            }}
            className="flex items-center gap-2.5 font-semibold"
          >
            <img
              src="/logo-192.png"
              alt="SprintJam"
              className="h-8 w-8 rounded-xl border border-white/60 bg-white/80 p-0.5 dark:border-white/10 dark:bg-white/5"
            />
            <span className="text-base tracking-tight text-slate-900 dark:text-white">
              SprintJam
            </span>
          </a>

          <nav className="hidden items-center gap-1 sm:flex">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                  screen === item.screen
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white",
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={startCreateFlow}
            icon={<Plus className="h-4 w-4" />}
          >
            <span className="hidden sm:inline">New Room</span>
            <span className="sm:hidden">New</span>
          </Button>

          <DarkModeToggle />

          {user && (
            <div className="hidden items-center gap-2 border-l border-slate-200 pl-2 dark:border-white/10 sm:flex">
              <span className="max-w-[120px] truncate text-sm text-slate-600 dark:text-slate-400">
                {user.email}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLogout}
                icon={<LogOut className="h-4 w-4" />}
                iconOnly
                aria-label="Sign out"
              />
            </div>
          )}

          {user && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLogout}
              icon={<LogOut className="h-4 w-4" />}
              className="sm:hidden"
              iconOnly
              aria-label="Sign out"
            />
          )}
        </div>
      </div>
    </header>
  );
}
