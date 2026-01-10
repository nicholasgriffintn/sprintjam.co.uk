import type { FC, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, Plus } from 'lucide-react';

import { useSessionActions, useSessionState } from '@/context/SessionContext';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { HeaderLogo } from '../HeaderLogo';
import DarkModeToggle from '../DarkModeToggle';
import { HEADER_TRANSITION } from '@/constants';
import { HeaderUserMenu } from '../HeaderUserMenu';

interface NavItem {
  icon: ReactNode;
  label: string;
  screen: string;
  onClick: () => void;
}

export const WorkspaceHeader: FC = () => {
  const { screen } = useSessionState();
  const { goHome, startCreateFlow, goToWorkspace } = useSessionActions();

  const navItems: NavItem[] = [
    {
      icon: <LayoutGrid className="h-4 w-4" />,
      label: 'Dashboard',
      screen: 'workspace',
      onClick: goToWorkspace,
    },
  ];

  return (
    <>
      <motion.div
        className="flex items-center gap-6"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={HEADER_TRANSITION}
      >
        <HeaderLogo
          size="xs"
          showText
          onClick={goHome}
          layoutId="header-logo"
        />

        <nav className="hidden items-center gap-1 sm:flex">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className={cn(
                'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
                screen === item.screen
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </motion.div>

      <motion.div
        className="flex items-center gap-2"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={HEADER_TRANSITION}
      >
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

        <HeaderUserMenu />
      </motion.div>
    </>
  );
};
