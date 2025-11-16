import type { FC } from 'react';

import { Spinner } from './ui/Spinner';

const LoadingOverlay: FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 dark:bg-black/30 backdrop-blur-sm">
      <div className="p-6 bg-white/90 dark:bg-slate-900/90 rounded-2xl shadow-floating border border-white/50 dark:border-white/10 flex flex-col items-center">
        <Spinner size="lg" className="mb-4 text-brand-500" />
        <p className="text-slate-700 dark:text-slate-300 font-medium">
          Loading...
        </p>
      </div>
    </div>
  );
};

export default LoadingOverlay;