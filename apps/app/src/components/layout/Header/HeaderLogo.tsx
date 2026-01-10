import type { FC } from 'react';
import { motion } from 'framer-motion';

import { cn } from '@/lib/cn';
import { type HeaderLogoProps } from './types';
import { LOGO_SIZES, LOGO_TEXT_SIZES, HEADER_TRANSITION } from '@/constants';

export const HeaderLogo: FC<HeaderLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  onClick,
  layoutId,
}) => {
  const sizeConfig = LOGO_SIZES[size];
  const textSize = LOGO_TEXT_SIZES[size];

  const content = (
    <>
      <motion.img
        layoutId={layoutId ? `${layoutId}-image` : undefined}
        src="/logo-192.png"
        alt="SprintJam"
        className={cn(
          sizeConfig.container,
          sizeConfig.padding,
          'rounded-2xl border border-white/60 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/5'
        )}
        transition={HEADER_TRANSITION}
      />
      {showText && (
        <motion.span
          layoutId={layoutId ? `${layoutId}-text` : undefined}
          className={cn(
            textSize,
            'font-semibold tracking-tight text-slate-900 dark:text-white'
          )}
          transition={HEADER_TRANSITION}
        >
          SprintJam
        </motion.span>
      )}
    </>
  );

  const containerClass = cn('flex items-center gap-3', className);

  if (onClick) {
    return (
      <motion.a
        href="/"
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
        className={cn(containerClass, 'cursor-pointer')}
        layout
        layoutId={layoutId}
        transition={HEADER_TRANSITION}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.div
      className={containerClass}
      layout
      layoutId={layoutId}
      transition={HEADER_TRANSITION}
    >
      {content}
    </motion.div>
  );
};
