import type { FC } from 'react';

interface ErrorBannerProps {
  message: string;
  onClose: () => void;
}

const ErrorBanner: FC<ErrorBannerProps> = ({ message, onClose }) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-3 m-4 bg-red-100 text-red-700 border border-red-300 rounded-md shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-2" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <title>Error icon</title>
            <path 
              fillRule="evenodd" 
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
              clipRule="evenodd" 
            />
          </svg>
          <span>{message}</span>
        </div>
        <button 
          type="button" 
          onClick={onClose} 
          className="text-red-700 hover:text-red-900 focus:outline-none"
          aria-label="Close error message"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <title>Close error message</title>
            <path 
              fillRule="evenodd" 
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
              clipRule="evenodd" 
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ErrorBanner;