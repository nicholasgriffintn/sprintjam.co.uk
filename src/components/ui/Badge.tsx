import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

interface BadgeProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  children: ReactNode;
  className?: string;
}

export const Badge = ({
  variant = 'default',
  size = 'md',
  children,
  className,
}: BadgeProps) => {
  const variants = {
    default:
      'bg-slate-200/70 text-slate-800 dark:bg-slate-700/50 dark:text-slate-300',
    primary: 'bg-brand-500/10 text-brand-700 dark:text-brand-300',
    success:
      'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    warning:
      'bg-yellow-100/80 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    error:
      'bg-rose-100/80 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    info: 'bg-blue-100/80 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md font-medium',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
};
