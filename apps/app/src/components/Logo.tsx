import type { FC } from "react";

import { SITE_NAME } from '@/constants';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const Logo: FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/logo-192.png"
        alt={SITE_NAME}
        className={`${sizes[size]} rounded-2xl border border-white/60 bg-white/80 p-1.5 shadow-sm dark:border-white/10 dark:bg-white/5`}
      />
      {showText && (
        <span
          className={`${textSizes[size]} font-semibold tracking-tight text-slate-900 dark:text-white`}
        >
          {SITE_NAME}
        </span>
      )}
    </div>
  );
};
