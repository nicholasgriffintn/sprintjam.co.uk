import { cn } from "@/lib/cn";
import {
  getAdminSidebarItems,
  navigateTo,
  type AppScreen,
} from "@/config/routes";
import { useSessionActions } from "@/context/SessionContext";

interface AdminSidebarProps {
  activeScreen: AppScreen;
}

export function AdminSidebar({ activeScreen }: AdminSidebarProps) {
  const { setScreen } = useSessionActions();
  const items = getAdminSidebarItems();

  const handleNavigate = (screen: AppScreen) => {
    setScreen(screen);
    navigateTo(screen);
  };

  return (
    <aside className="w-full lg:w-60">
      <nav className="space-y-1">
        {items.map((item) => {
          const isActive = activeScreen === item.screen;
          const Icon = item.icon;

          return (
            <button
              key={item.screen}
              type="button"
              onClick={() => handleNavigate(item.screen)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition",
                isActive
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
              )}
            >
              {Icon && <Icon className="h-5 w-5" />}
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
