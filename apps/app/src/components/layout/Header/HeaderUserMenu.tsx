import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, LayoutGrid, Loader2, LogOut, UserRound } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useWorkspaceAuth } from "@/context/WorkspaceAuthContext";
import { cn } from "@/lib/cn";
import { isWorkspacesEnabled } from "@/utils/feature-flags";
import { useSessionActions } from "@/context/SessionContext";
import type { MarketingVariant } from '@/components/layout/Header/types';

const getInitials = (nameOrEmail: string | null | undefined) => {
  if (!nameOrEmail) return null;
  const trimmed = nameOrEmail.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(" ");
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return trimmed.slice(0, 2).toUpperCase();
};

interface HeaderUserMenuProps {
  variant?: MarketingVariant;
}

export const HeaderUserMenu = ({ variant }: HeaderUserMenuProps = {}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user, isAuthenticated, isLoading, logout } = useWorkspaceAuth();
  const { goHome, goToWorkspace, goToLogin } = useSessionActions();

  const showNavigation = isWorkspacesEnabled();
  const isHero = variant === "hero";

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeydown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [isMenuOpen]);

  const displayName = useMemo(
    () => user?.name || user?.email || "Workspace user",
    [user],
  );

  const avatarLabel = useMemo(
    () =>
      getInitials(user?.name) ||
      getInitials(user?.email) ||
      (isAuthenticated ? "WS" : null),
    [isAuthenticated, user],
  );

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      goHome();
    } finally {
      setIsLoggingOut(false);
      setIsMenuOpen(false);
    }
  };

  const handleWorkspace = () => {
    goToWorkspace();
    setIsMenuOpen(false);
  };

  if (!showNavigation) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return (
      <Button
        variant="secondary"
        size="sm"
        icon={<KeyRound className={cn("h-4 w-4", isHero && "sm:h-5 sm:w-5")} />}
        iconOnly
        expandOnHover
        aria-label="Sign in"
        onClick={goToLogin}
        className={cn(
          "min-h-9 min-w-9 border-slate-200/80 bg-white/80 text-slate-700 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white",
          isHero && "sm:min-h-10 sm:min-w-10",
        )}
      >
        Sign in
      </Button>
    );
  }

  return (
    <div ref={containerRef} className="relative z-40">
      <button
        type="button"
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-gradient-to-br from-brand-500 to-indigo-500 text-sm font-semibold uppercase text-white shadow-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 dark:border-white/10 dark:from-brand-600 dark:to-indigo-600",
          isMenuOpen &&
            "ring-2 ring-brand-200 ring-offset-2 ring-offset-transparent",
        )}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((open) => !open)}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          avatarLabel || <UserRound className="h-5 w-5" />
        )}
      </button>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-[calc(100%+0.75rem)] w-56 overflow-hidden rounded-2xl border border-black/5 bg-white/95 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95 z-50"
          >
            <div className="border-b border-black/5 px-4 py-3 text-left dark:border-white/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Signed in
              </p>
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {displayName}
              </p>
            </div>

            <div className="p-1.5">
              <button
                type="button"
                onClick={handleWorkspace}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
              >
                <LayoutGrid className="h-4 w-4 text-brand-600 dark:text-brand-200" />
                Go to workspace
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-70 dark:text-rose-200 dark:hover:bg-rose-500/10"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
