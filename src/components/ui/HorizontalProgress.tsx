import type { FC } from 'react';
import { motion } from 'framer-motion';

interface HorizontalProgressProps {
  total: number;
  completed: number;
  [key: string]: unknown;
}

export const HorizontalProgress: FC<HorizontalProgressProps> = ({
  total,
  completed,
  ...props
}) => {
  const percent =
    total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  return (
    <div
      className="w-full rounded-full bg-slate-200 dark:bg-slate-800/80"
      {...props}
    >
      <motion.div
        className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-indigo-500"
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
};
