import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useOptionalTheme } from "@/lib/theme-context";

export function DarkModeToggle() {
  const themeContext = useOptionalTheme();

  if (!themeContext) {
    return null;
  }

  const { theme, toggleTheme } = themeContext;
  const isLight = theme === "light";
  const nextThemeLabel = isLight ? "dark" : "light";
  const visibleLabel = isLight ? "Dark mode" : "Light mode";

  return (
    <Button
      type="button"
      variant="unstyled"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextThemeLabel} mode`}
      className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:border-brand-300/60"
    >
      {isLight ? (
        <Moon className="h-3.5 w-3.5" />
      ) : (
        <Sun className="h-3.5 w-3.5" />
      )}
      {visibleLabel}
    </Button>
  );
}
