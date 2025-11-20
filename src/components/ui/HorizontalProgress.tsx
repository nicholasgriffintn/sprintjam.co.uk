import type { FC } from 'react';

interface HorizontalProgressProps {
  total: number;
  completed: number;
}

export const HorizontalProgress: FC<HorizontalProgressProps> = ({
  total,
  completed,
}) => {
  const percent =
    total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  return (
    <div className="w-full rounded-full bg-slate-200 dark:bg-slate-800/80">
      <div
        className="h-2 rounded-full bg-green-500 transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
};
