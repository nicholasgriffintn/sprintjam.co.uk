import type { FC } from 'react';

const LoadingOverlay: FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 dark:bg-black/30">
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-700 dark:text-gray-300 font-medium">Loading...</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;