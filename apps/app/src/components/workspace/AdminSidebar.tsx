import { LayoutDashboard, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";
import { useSessionActions, type AppScreen } from "@/context/SessionContext";

interface AdminNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  screen: AppScreen;
  onClick: () => void;
}

interface AdminSidebarProps {
  activeScreen: AppScreen;
}

export function AdminSidebar({ activeScreen }: AdminSidebarProps) {
  const { goToWorkspaceAdmin, goToWorkspaceAdminTeams } = useSessionActions();

  const items: AdminNavItem[] = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
      screen: "workspaceAdmin",
      onClick: goToWorkspaceAdmin,
    },
    {
      id: "teams",
      label: "Teams",
      icon: Users,
      screen: "workspaceAdminTeams",
      onClick: goToWorkspaceAdminTeams,
    },
  ];

  return (
    <aside className="w-full lg:w-60">
      <nav className="space-y-1">
        {items.map((item) => {
          const isActive = activeScreen === item.screen;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition",
                isActive
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
