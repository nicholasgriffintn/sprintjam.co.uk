import { useEffect, useRef, useState, type FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Menu, X } from 'lucide-react';

import { HeaderLogo } from '../HeaderLogo';
import type { MarketingHeaderProps } from '../types';
import { useSessionActions } from '@/context/SessionContext';
import { HeaderUserMenu } from '../HeaderUserMenu';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { navigateTo, type AppScreen } from '@/config/routes';

export const MarketingHeader: FC<MarketingHeaderProps> = ({ variant }) => {
  const { goHome, setScreen, startCreateFlow, startJoinFlow } =
    useSessionActions();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const logoSize = variant === 'hero' ? 'lg' : 'md';

  const links: Array<{ label: string; screen: AppScreen }> = [
    { label: 'Integrations', screen: 'integrations' },
    { label: 'FAQ', screen: 'faq' },
    { label: 'Guides', screen: 'guides' },
    { label: 'Changelog', screen: 'changelog' },
  ];

  const handleNavigate = (screen: AppScreen) => {
    setScreen(screen);
    navigateTo(screen);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [isMenuOpen]);

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4">
      <div className="flex items-center justify-start">
        <div ref={menuRef} className="relative">
          <Button
            id="marketing-menu-button"
            variant="secondary"
            size="sm"
            icon={
              isMenuOpen ? (
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
              )
            }
            iconOnly
            expandOnHover
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            aria-label="Open marketing navigation"
            onClick={() => setIsMenuOpen((open) => !open)}
            className={cn(
              'min-h-9 min-w-9 border-slate-200/80 bg-white/80 text-slate-700 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white',
              variant === 'hero' && 'sm:min-h-10 sm:min-w-10',
            )}
            data-testid="marketing-menu-button"
          >
            Menu
          </Button>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                role="menu"
                aria-labelledby="marketing-menu-button"
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className="absolute left-0 top-[calc(100%+0.75rem)] z-40 w-[min(90vw,22rem)] overflow-hidden rounded-3xl border border-black/5 bg-white/95 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95"
              >
                <div className="border-b border-black/5 px-5 py-4 text-left dark:border-white/10">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Explore SprintJam
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    Jump to the essentials.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-1.5 px-4 py-4 sm:grid-cols-2">
                  {links.map((link) => (
                    <button
                      key={link.screen}
                      type="button"
                      role="menuitem"
                      onClick={() => handleNavigate(link.screen)}
                      className="group flex w-full items-center justify-between rounded-2xl border border-transparent bg-white/70 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:bg-white hover:text-slate-900 dark:bg-white/5 dark:text-slate-200 dark:hover:border-brand-300/60 dark:hover:bg-white/10"
                    >
                      <span>{link.label}</span>
                      <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-brand-400 dark:text-slate-600" />
                    </button>
                  ))}
                </div>

                <div className="border-t border-black/5 px-4 py-4 dark:border-white/10">
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      fullWidth
                      role="menuitem"
                      onClick={() => {
                        startCreateFlow();
                        setIsMenuOpen(false);
                      }}
                    >
                      Create a room
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      fullWidth
                      role="menuitem"
                      onClick={() => {
                        startJoinFlow();
                        setIsMenuOpen(false);
                      }}
                    >
                      Join a session
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <HeaderLogo
        size={logoSize}
        showText
        onClick={goHome}
        className={variant === 'hero' ? 'scale-95 sm:scale-100' : ''}
        layoutId="marketing-header-logo"
      />
      <div className="flex justify-end">
        <HeaderUserMenu variant={variant} />
      </div>
    </div>
  );
};
